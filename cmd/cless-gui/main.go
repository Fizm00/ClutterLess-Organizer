// SPDX-License-Identifier: AGPL-3.0-only

package main

import (
	"context"
	"embed"
	_ "embed"
	"flag"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/Fizm00/organizer/internal/app"
	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/history"
	"github.com/Fizm00/organizer/internal/platform"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

//go:embed build/tray_active.png
var trayActiveIcon []byte

//go:embed build/tray_paused.png
var trayPausedIcon []byte

//go:embed build/tray_error.png
var trayErrorIcon []byte

func init() {
	// Register custom events
	application.RegisterEvent[any](app.EventWatchStatus)
	application.RegisterEvent[any](app.EventFileMoved)
	application.RegisterEvent[any](app.EventFileSkipped)
	application.RegisterEvent[any](app.EventFileFailed)
	application.RegisterEvent[any](app.EventRunProgress)
	application.RegisterEvent[any](app.EventConfigChanged)
	application.RegisterEvent[any](app.EventAppError)
}

// wailsFolderPicker implements app.FolderPicker using Wails native open directory dialog.
type wailsFolderPicker struct {
	app *application.App
}

func (p *wailsFolderPicker) PickFolder() (string, error) {
	if p.app == nil {
		return "", app.NewAppError(app.ErrInternal, "Application not initialized", "", "")
	}
	dialog := p.app.Dialog.OpenFile()
	dialog.CanChooseDirectories(true)
	dialog.CanChooseFiles(false)
	dialog.SetTitle("Select Folder to Watch")
	return dialog.PromptForSingleSelection()
}

// wailsAutostartAdapter wraps Wails v3 AutostartManager into app.AutostartManager.
type wailsAutostartAdapter struct {
	app *application.App
}

func (w *wailsAutostartAdapter) Get() (bool, error) {
	if w.app == nil {
		return false, nil
	}
	return w.app.Autostart.IsEnabled()
}

func (w *wailsAutostartAdapter) Set(enabled bool) error {
	if w.app == nil {
		return fmt.Errorf("application not initialized")
	}
	if enabled {
		return w.app.Autostart.EnableWithOptions(application.AutostartOptions{
			Identifier: "ClutterLess",
			Arguments:  []string{"--hidden"},
		})
	}
	return w.app.Autostart.Disable()
}

// wailsNotifierAdapter bridges notification delivery to Wails notifications service.
type wailsNotifierAdapter struct {
	ns     *notifications.NotificationService
	window *application.WebviewWindow
}

func (w *wailsNotifierAdapter) SendNotification(title, body string, isError bool) error {
	if w.ns == nil {
		return nil
	}
	level := notifications.InterruptionLevelActive
	if isError {
		level = notifications.InterruptionLevelTimeSensitive
	}
	return w.ns.SendNotification(notifications.NotificationOptions{
		Title:             title,
		Body:              body,
		InterruptionLevel: level,
	})
}

func (w *wailsNotifierAdapter) IsWindowFocused() bool {
	return w.window != nil && w.window.IsVisible() && w.window.IsFocused()
}

func main() {
	var hiddenFlag bool
	var configFlag string
	flag.BoolVar(&hiddenFlag, "hidden", false, "Start minimized in the system tray")
	flag.StringVar(&configFlag, "config", "", "Path to custom configuration file")
	flag.Parse()

	var mainWindow *application.WebviewWindow
	var quitting bool
	var wailsApp *application.App
	var watchService *app.WatchService
	var statusItem *application.MenuItem
	var pauseResumeItem *application.MenuItem
	var tray *application.SystemTray
	var notificationAggregator *app.NotificationAggregator
	var notifierAdapter *wailsNotifierAdapter
	var shownCloseToTrayToast bool

	// 1. Setup EventSink that bridges app events to Wails runtime events and system tray
	eventSink := app.NewCallbackEventSink(func(name string, payload any) {
		if wailsApp != nil {
			wailsApp.Event.Emit(name, payload)
		}

		// Handle live status changes for system tray and notifications
		switch name {
		case app.EventWatchStatus:
			if status, ok := payload.(app.WatchStatusDTO); ok {
				if status.Running {
					if statusItem != nil {
						statusItem.SetLabel(fmt.Sprintf("Watching %d folders", len(status.Folders)))
					}
					if pauseResumeItem != nil {
						pauseResumeItem.SetLabel("Pause watching")
					}
					if tray != nil {
						tray.SetIcon(trayActiveIcon)
						tray.SetTooltip(fmt.Sprintf("ClutterLess — Watching %d folders", len(status.Folders)))
					}
				} else {
					if status.Error != "" {
						if statusItem != nil {
							statusItem.SetLabel("Watcher error")
						}
						if pauseResumeItem != nil {
							pauseResumeItem.SetLabel("Resume watching")
						}
						if tray != nil {
							tray.SetIcon(trayErrorIcon)
							tray.SetTooltip(fmt.Sprintf("ClutterLess — Error: %s", status.Error))
						}
						if notificationAggregator != nil {
							_ = notificationAggregator.SendError("Watcher Error", status.Error)
						}
					} else {
						if statusItem != nil {
							statusItem.SetLabel("Watcher paused")
						}
						if pauseResumeItem != nil {
							pauseResumeItem.SetLabel("Resume watching")
						}
						if tray != nil {
							tray.SetIcon(trayPausedIcon)
							tray.SetTooltip("ClutterLess — Paused")
						}
					}
				}
			}

		case app.EventFileMoved:
			if record, ok := payload.(app.FileMovedPayload); ok && notificationAggregator != nil {
				folder := filepath.Dir(record.Dest)
				notificationAggregator.RecordMove(folder, 1)
			}

		case app.EventConfigChanged:
			if watchService != nil && watchService.Status().Running {
				go func() {
					_ = watchService.Reload()
				}()
			}
		}
	})

	// 2. Resolve default paths for config, storage, and state
	configPath, _ := config.DefaultConfigPath()
	if configFlag != "" {
		configPath = configFlag
	}
	stateDir, _ := platform.DefaultStateDir()
	storage, _ := history.NewStorage("")

	// 3. Instantiate services
	systemService := app.NewSystemService()
	systemService.SetConfigPath(configPath)

	configService, err := app.NewConfigService(configPath, eventSink)
	if err != nil {
		log.Printf("Warning: initial config loading issue: %v", err)
	}

	rulesService := app.NewRulesService(configService)
	organizeService := app.NewOrganizeService(configService, storage, eventSink)
	historyService := app.NewHistoryService(configService, storage, eventSink)
	watchService = app.NewWatchService(configService, storage, eventSink, stateDir)

	notificationService := notifications.New()

	// 4. Initialize Wails App with all services and single-instance options
	wailsApp = application.New(application.Options{
		Name:        "ClutterLess",
		Description: "ClutterLess Organizer Desktop GUI",
		Services: []application.Service{
			application.NewService(systemService),
			application.NewService(configService),
			application.NewService(rulesService),
			application.NewService(organizeService),
			application.NewService(historyService),
			application.NewService(watchService),
			application.NewService(notificationService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "com.clutterless.cless-gui",
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				if mainWindow != nil {
					mainWindow.Show()
					mainWindow.Focus()
				}
			},
		},
	})

	// Inject native adapters
	systemService.SetFolderPicker(&wailsFolderPicker{app: wailsApp})
	systemService.SetAutostartManager(&wailsAutostartAdapter{app: wailsApp})

	// 5. Create Main Window (DESIGN.md section 3: default 1080x700, min 880x560)
	mainWindow = wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "ClutterLess",
		Width:     1080,
		Height:    700,
		MinWidth:  880,
		MinHeight: 560,
		URL:       "/",
	})

	notifierAdapter = &wailsNotifierAdapter{
		ns:     notificationService,
		window: mainWindow,
	}
	notificationAggregator = app.NewNotificationAggregator(notifierAdapter, 2*time.Second)
	// Enable notifications according to user setting
	if configService != nil {
		notificationAggregator.SetEnabled(configService.Get().Settings.NotificationsEnabled)
	}

	// Intercept window closing for close-to-tray
	mainWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if quitting {
			return
		}
		closeToTray := true
		if configService != nil {
			cfg := configService.Get()
			if cfg.Settings.CloseToTray != nil {
				closeToTray = *cfg.Settings.CloseToTray
			}
		}
		if closeToTray {
			event.Cancel()
			mainWindow.Hide()
			if !shownCloseToTrayToast && watchService != nil && watchService.Status().Running {
				shownCloseToTrayToast = true
				_ = notifierAdapter.SendNotification("ClutterLess", "Still running in the tray.", false)
			}
		} else {
			quitting = true
			if watchService != nil {
				_ = watchService.Stop()
			}
		}
	})

	// 6. Setup System Tray
	tray = wailsApp.SystemTray.New()
	if len(trayActiveIcon) > 0 {
		tray.SetIcon(trayActiveIcon)
	} else if len(appIcon) > 0 {
		tray.SetIcon(appIcon)
	}
	tray.SetTooltip("ClutterLess Organizer")

	trayMenu := wailsApp.NewMenu()
	statusItem = trayMenu.Add("Watcher ready").SetEnabled(false)

	trayMenu.Add("Open ClutterLess").OnClick(func(ctx *application.Context) {
		if mainWindow != nil {
			mainWindow.Show()
			mainWindow.Focus()
		}
	})

	pauseResumeItem = trayMenu.Add("Pause watching").OnClick(func(ctx *application.Context) {
		if watchService != nil {
			if watchService.Status().Running {
				_ = watchService.Stop()
			} else {
				_ = watchService.Start()
			}
		}
	})

	trayMenu.Add("Organize now").OnClick(func(ctx *application.Context) {
		if mainWindow != nil {
			mainWindow.Show()
			mainWindow.Focus()
		}
		if organizeService != nil {
			go func() {
				_, _ = organizeService.Run(context.Background(), app.RunRequestDTO{})
			}()
		}
	})

	trayMenu.AddSeparator()

	quitItem := trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		quitting = true
		if watchService != nil {
			_ = watchService.Stop()
		}
		wailsApp.Quit()
	})
	quitItem.SetAccelerator("CmdOrCtrl+Q")

	tray.SetMenu(trayMenu)

	tray.OnClick(func() {
		if mainWindow != nil {
			if mainWindow.IsVisible() && mainWindow.IsFocused() {
				mainWindow.Hide()
			} else {
				mainWindow.Show()
				mainWindow.Focus()
			}
		}
	})

	// If not launched with --hidden, show the main window immediately
	if !hiddenFlag {
		mainWindow.Show()
		mainWindow.Focus()
	}

	// Run Wails application
	if err := wailsApp.Run(); err != nil {
		log.Fatal(err)
	}
}
