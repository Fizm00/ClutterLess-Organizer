# ClutterLess Desktop GUI — Release Verification Checklist

This checklist defines the required smoke tests and quality gates before tagging and publishing a production release of `cless-gui`.

---

## 1. Automated Pre-Release Quality Gates

All automated checks must pass with zero errors, zero warnings, and clean exit codes:

- [ ] **Go Core & Services:**
  ```bash
  go vet ./internal/... ./cmd/organizer ./cmd/cless ./cmd/cless-gui
  go test -v ./internal/... ./cmd/organizer ./cmd/cless
  ```
- [ ] **Frontend Lint & Types:**
  ```bash
  cd cmd/cless-gui/frontend
  npm run lint           # ESLint (0 warnings)
  npm run lint:style     # Anti-slop style linter (0 violations across all files)
  npm run typecheck      # TypeScript compilation (0 type errors)
  npm test               # Vitest suite (all 56 unit & component tests passing)
  ```
- [ ] **Production Bundle Build:**
  ```bash
  npm run build          # Builds embedded assets to cmd/cless-gui/frontend/dist
  ```

---

## 2. Build Assets & Executable Metadata

Verify that the generated Windows binary contains authentic metadata matching CLI versioning flags:

- [ ] **Windows Manifest & Version Resources:**
  ```powershell
  # Generate Windows resources (.syso)
  wails3 generate syso -arch amd64 -icon cmd/cless-gui/build/windows/icon.ico -manifest cmd/cless-gui/build/windows/wails.exe.manifest -info cmd/cless-gui/build/windows/info.json -out cmd/cless-gui/wails_windows_amd64.syso

  # Build executable
  go build -tags production -trimpath -ldflags "-s -w -H windowsgui -X github.com/Fizm00/organizer/internal/version.Version=0.3.0 -X github.com/Fizm00/organizer/internal/version.Commit=$(git rev-parse --short HEAD) -X github.com/Fizm00/organizer/internal/version.BuildDate=$(Get-Date -Format 'yyyy-MM-dd')" -o bin/cless-gui.exe ./cmd/cless-gui

  # Verify executable properties
  (Get-Item bin/cless-gui.exe).VersionInfo | Format-List ProductName, FileDescription, CompanyName, LegalCopyright, ProductVersion, FileVersion
  ```
  Expected output:
  - `ProductName`: ClutterLess
  - `FileDescription`: ClutterLess Organizer Desktop GUI
  - `CompanyName`: ClutterLess
  - `LegalCopyright`: (c) 2026, Fizm00
  - `ProductVersion`: 0.3.0
  - `FileVersion`: 0.3.0
- [ ] **Icons:**
  - Multi-resolution `.ico` (16x16, 32x32, 48x48, 64x64, 128x128, 256x256) embedded and rendering properly in Windows Explorer and Taskbar.
  - Monochrome tray template icons (`tray_active.png`, `tray_paused.png`, `tray_error.png`) present in `cmd/cless-gui/build/`.

---

## 3. Windows Installer Verification (NSIS)

Build and test the NSIS installer package on a Windows machine:

- [ ] **Installer Generation:**
  ```bash
  # Ensure WebView2 bootstrapper is downloaded/generated
  wails3 generate webview2bootstrapper -dir cmd/cless-gui/build/windows/nsis

  # Compile installer via makensis
  cd cmd/cless-gui/build/windows/nsis
  makensis -DARG_WAILS_AMD64_BINARY=..\..\..\bin\cless-gui.exe project.nsi
  ```
- [ ] **Installation Flow:**
  - Double-click `cless-gui-amd64-installer.exe`.
  - Confirm installation runs **without requiring UAC administrator elevation**.
  - Default install directory targets `$LOCALAPPDATA\Programs\ClutterLess`.
  - Verify Start Menu shortcut (`ClutterLess.lnk`) is created.
  - Verify Desktop shortcut (`ClutterLess.lnk`) is created.
  - Verify finish page displays "Launch ClutterLess" and unchecked opt-in "Start ClutterLess with Windows".

---

## 4. First-Launch & Onboarding Smoke Test

- [ ] **Clean State:**
  - If testing fresh installation, temporarily rename `%APPDATA%\cless` to test initial launch.
  - Launch `cless-gui.exe`.
  - Verify Onboarding dialog appears guiding the user to configure watch folders.
  - Completing setup creates a valid `%APPDATA%\cless\config.yaml` with 11 default rule categories.

---

## 5. Core GUI Workflow Smoke Test

- [ ] **Overview Screen:**
  - Watcher pill displays live green status dot ("Watching 1 folder").
  - Monitored folder chips display paths with direct folder opening buttons.
  - Recent activity table displays past moves with middle-truncated paths.
- [ ] **Preview & Run Flow:**
  - Place 2 test files into `~/Downloads` (e.g. `report.pdf` and `photo.jpg`).
  - Click `Organize now` button on the Overview screen.
  - Slide-out sheet opens from the right (560px width).
  - Inspect items categorized under *Will move* and *Skipped*.
  - Uncheck one file -> verify primary button updates label dynamically (e.g. "Move 1 file").
  - Click the primary Move button -> verify progress counter increments (`Moving 1/1...`).
  - Upon completion, sheet closes, Overview updates, and an undo toast appears with action button.
- [ ] **Activity & Batch Undo:**
  - Navigate to the Activity screen (`/activity`).
  - Verify the executed batch appears under *Today* with unique batch ID, file count, and `Applied` badge.
  - Click `Undo batch` button.
  - Confirmation dialog opens specifying the number of files to restore.
  - Confirm undo -> verify files are restored to source paths.
  - Verify status badge changes to `Undone`.
- [ ] **Rules Management:**
  - Navigate to the Rules screen (`/rules`).
  - Reorder rules using drag handles and keyboard shortcut (`Alt+Up` / `Alt+Down`).
  - Click `+ New rule` -> editor dialog opens.
  - Add condition, click template chips (`{year}`, `{month}`, `{name}`), observe resolved sample path preview.
  - Live validation correctly catches syntax errors matching CLI validator messages.
  - In the Rule Tester section at the bottom, type a test filename (e.g. `faktur_2026.pdf`) and verify matching rule name and resolved destination.
- [ ] **Folders Screen:**
  - Navigate to the Folders screen (`/folders`).
  - Test toggling recursive scanning switch.
  - Click `Add folder` and verify directory picker opens.

---

## 6. System Integration Smoke Test

- [ ] **Close to Tray:**
  - With close-to-tray enabled in Settings, click the window `X` (close) button.
  - Verify the window hides rather than terminating the process.
  - First minimize displays the educational toast: *"Still running in the tray."*
- [ ] **System Tray Menu:**
  - Locate ClutterLess icon in Windows notification area.
  - Verify tray status text displays live state.
  - Test `Pause watching` / `Resume watching` from tray menu.
  - Test `Organize now` from tray menu.
  - Left-click brings the main window back to focus.
  - Right-click -> `Quit` terminates the application cleanly.
- [ ] **Single Instance:**
  - While ClutterLess is running, attempt to launch `cless-gui.exe` again.
  - Verify second process exits immediately and existing window is brought to the foreground.
- [ ] **Silent Autostart:**
  - Enable "Start on system boot" in Settings.
  - Verify registry key `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\ClutterLess` is created with value `"<path>\cless-gui.exe" --hidden`.
  - Launch `cless-gui.exe --hidden` manually from terminal -> verify app starts silently in the tray without popping open the window.

---

## 7. Uninstallation & Data Preservation Smoke Test

- [ ] Run uninstaller (`%LOCALAPPDATA%\Programs\ClutterLess\uninstall.exe` or via Windows Settings > Installed apps).
- [ ] Verify autostart registry entry is removed from `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- [ ] **Data Preservation Confirmation:**
  - A message box prompts: *"Do you want to delete your ClutterLess configuration and organization history?"*
  - Select **No**:
    - Verify `%APPDATA%\cless\config.yaml` and `history.jsonl` are **intact**.
    - Verify `$LOCALAPPDATA\Programs\ClutterLess` and shortcuts are deleted.
- [ ] (Optional Test) Run uninstaller and select **Yes**:
  - Verify `%APPDATA%\cless` is completely purged.

---

## 8. Release Sign-Off

| Verification Step | Tester / Agent | Result | Date |
| --- | --- | --- | --- |
| Automated Quality Gates | Antigravity AI | PASS | 2026-10-29 |
| Executable Properties (.syso) | Antigravity AI | PASS | 2026-10-29 |
| NSIS Installer Configuration | Antigravity AI | PASS | 2026-10-29 |
| Multi-OS CI Workflows | Antigravity AI | PASS | 2026-10-29 |
| Release Asset Pipelines | Antigravity AI | PASS | 2026-10-29 |
| Documentation & Third-Party Licenses | Antigravity AI | PASS | 2026-10-29 |
