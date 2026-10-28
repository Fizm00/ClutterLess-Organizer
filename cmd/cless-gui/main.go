// SPDX-License-Identifier: AGPL-3.0-only

package main

import (
	"embed"
	_ "embed"
	"log"

	"github.com/Fizm00/organizer/internal/app"
	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/history"
	"github.com/Fizm00/organizer/internal/platform"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
	var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

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

func main() {
	var mainWindow *application.WebviewWindow
	var quitting bool
	var wailsApp *application.App
	var watchService *app.WatchService

	// 1. Setup EventSink that bridges app events to Wails runtime events
	eventSink := app.NewCallbackEventSink(func(name string, payload any) {
		if wailsApp != nil {
			wailsApp.Event.Emit(name, payload)
		}
		// Automatically reload watcher when configuration changes
		if name == app.EventConfigChanged && watchService != nil && watchService.Status().Running {
			go func() {
				_ = watchService.Reload()
			}()
		}
	})

	// 2. Resolve default paths for config, storage, and state
	configPath, _ := config.DefaultConfigPath()
	stateDir, _ := platform.DefaultStateDir()
	storage, _ := history.NewStorage("")

	// 3. Instantiate G1 services
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

	// 4. Initialize Wails App with all services
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

	// Inject native folder picker into system service
	systemService.SetFolderPicker(&wailsFolderPicker{app: wailsApp})

	// 5. Create Main Window (DESIGN.md section 3: default 1080x700, min 880x560)
	mainWindow = wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "ClutterLess",
		Width:     1080,
		Height:    700,
		MinWidth:  880,
		MinHeight: 560,
		URL:       "/",
	})

	// Intercept window closing to hide to tray instead of quitting
	mainWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if !quitting {
			event.Cancel()
			mainWindow.Hide()
		}
	})

	// 6. Setup System Tray
	tray := wailsApp.SystemTray.New()
	if len(appIcon) > 0 {
		tray.SetIcon(appIcon)
	}
	tray.SetTooltip("ClutterLess Organizer")

	trayMenu := wailsApp.NewMenu()
	trayMenu.Add("Open ClutterLess").OnClick(func(ctx *application.Context) {
		if mainWindow != nil {
			mainWindow.Show()
			mainWindow.Focus()
		}
	})
	trayMenu.AddSeparator()
	trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		quitting = true
		wailsApp.Quit()
	})
	tray.SetMenu(trayMenu)

	tray.OnClick(func() {
		if mainWindow != nil {
			if mainWindow.IsVisible() {
				mainWindow.Hide()
			} else {
				mainWindow.Show()
				mainWindow.Focus()
			}
		}
	})

	// Run Wails application
	if err := wailsApp.Run(); err != nil {
		log.Fatal(err)
	}
}
