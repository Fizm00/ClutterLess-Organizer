// SPDX-License-Identifier: AGPL-3.0-only

package main

import (
	"embed"
	_ "embed"
	"log"
	"time"

	"github.com/Fizm00/organizer/internal/app"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func init() {
	// Register the typed tick event.
	application.RegisterEvent[int]("tick")
}

func main() {
	var mainWindow *application.WebviewWindow
	var quitting bool

	systemService := app.NewSystemService()

	wailsApp := application.New(application.Options{
		Name:        "ClutterLess",
		Description: "ClutterLess Organizer Desktop GUI",
		Services: []application.Service{
			application.NewService(systemService),
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

	mainWindow = wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "ClutterLess Organizer (G0 Spike)",
		Width:  800,
		Height: 600,
		URL:    "/",
	})

	// Intercept window closing to hide to tray instead of quitting.
	mainWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if !quitting {
			event.Cancel()
			mainWindow.Hide()
		}
	})

	// Create system tray.
	tray := wailsApp.SystemTray.New()
	if len(appIcon) > 0 {
		tray.SetIcon(appIcon)
	}
	tray.SetTooltip("ClutterLess Organizer")

	trayMenu := wailsApp.NewMenu()
	trayMenu.Add("Open").OnClick(func(ctx *application.Context) {
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

	// Background ticker emitting event every second.
	go func() {
		counter := 0
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			counter++
			wailsApp.Event.Emit("tick", counter)
		}
	}()

	err := wailsApp.Run()
	if err != nil {
		log.Fatal(err)
	}
}

