# Autostart Guide

This guide explains how to configure `organizer` (Cless) to automatically start in background `watch` mode when you log in.

> [!NOTE]
> `organizer` does not provide an automated background service installer in order to remain transparent, lightweight, and rootless. Choose the method below that matches your operating system.

---

## 1. Windows

### Option A: Task Scheduler (Recommended)

Windows Task Scheduler runs `organizer watch` automatically upon user login, without displaying an open terminal window.

#### 1. Command Line Setup (`schtasks`)
Open **PowerShell** or **Command Prompt** and run:

```cmd
schtasks /Create /TN "ClutterLessOrganizer" /TR "\"%USERPROFILE%\bin\organizer.exe\" watch" /SC ONLOGON /RL LIMITED
```
*(Replace `%USERPROFILE%\bin\organizer.exe` with the actual path to your `organizer.exe` binary.)*

#### 2. Verify Task Status
```cmd
schtasks /Query /TN "ClutterLessOrganizer" /FO LIST /V
```

#### 3. Run Manually to Test
```cmd
schtasks /Run /TN "ClutterLessOrganizer"
```

#### 4. Remove Autostart Task
```cmd
schtasks /Delete /TN "ClutterLessOrganizer" /F
```

---

### Option B: Windows Startup Folder

You can also place a shortcut or silent launcher in your personal Startup folder.

1. Press `Win + R`, type `shell:startup`, and press Enter. This opens:
   `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
2. Create a silent VBScript runner file named `organizer_silent.vbs`:

```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run Chr(34) & WshShell.ExpandEnvironmentStrings("%USERPROFILE%\bin\organizer.exe") & Chr(34) & " watch", 0, False
Set WshShell = Nothing
```

This launches `organizer watch` silently in the background at every login without keeping a command prompt window visible.

---

## 2. Linux (systemd User Unit)

Modern Linux distributions using systemd can run `organizer` as a rootless user service.

### 1. Create the Service Unit File
Create directory `~/.config/systemd/user/` if it does not exist:

```bash
mkdir -p ~/.config/systemd/user
```

Create `~/.config/systemd/user/organizer.service`:

```ini
[Unit]
Description=ClutterLess Organizer File Watcher
Documentation=https://github.com/Fizm00/ClutterLess-Organizer
After=default.target

[Service]
Type=simple
ExecStart=%h/.local/bin/organizer watch
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```
*(Ensure `ExecStart` points to where your binary is located, e.g. `%h/.local/bin/organizer` or `/usr/local/bin/organizer`.)*

### 2. Enable and Start the Service
```bash
# Reload user units
systemctl --user daemon-reload

# Enable to start on login and start immediately
systemctl --user enable --now organizer.service
```

### 3. Check Status and Logs
```bash
# Check service status
systemctl --user status organizer.service

# View live log output
journalctl --user -u organizer.service -f
```

### 4. Stop and Disable
```bash
systemctl --user stop organizer.service
systemctl --user disable organizer.service
```

---

## 3. macOS (launchd User Agent)

On macOS, `launchd` manages per-user background background processes (User Agents).

### 1. Create the LaunchAgent Plist
Create directory `~/Library/LaunchAgents` if it does not exist:

```bash
mkdir -p ~/Library/LaunchAgents
```

Create `~/Library/LaunchAgents/com.user.organizer.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.organizer</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/organizer</string>
        <string>watch</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    
    <key>StandardOutPath</key>
    <string>/tmp/organizer.stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/organizer.stderr.log</string>
</dict>
</plist>
```
*(Adjust `/usr/local/bin/organizer` if your binary is installed elsewhere, such as `~/.local/bin/organizer`.)*

### 2. Load and Start the Agent
```bash
launchctl load ~/Library/LaunchAgents/com.user.organizer.plist
```

### 3. Verify Agent is Running
```bash
launchctl list | grep organizer
```

### 4. Stop and Unload
```bash
launchctl unload ~/Library/LaunchAgents/com.user.organizer.plist
```
