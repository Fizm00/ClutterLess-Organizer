Unicode true

####
## Wails v3 NSIS installer configuration for ClutterLess
####
!define INFO_PROJECTNAME    "cless-gui"
!define INFO_COMPANYNAME    "ClutterLess"
!define INFO_PRODUCTNAME    "ClutterLess"
!define INFO_PRODUCTVERSION "1.0.0"
!define INFO_COPYRIGHT      "(c) 2026, Fizm00"
!define PRODUCT_EXECUTABLE  "cless-gui.exe"
!define UNINST_KEY_NAME     "ClutterLess"

# Per-user installation without requiring UAC administrator elevation
!define WAILS_INSTALL_SCOPE     "user"
!define REQUEST_EXECUTION_LEVEL "user"

####
## Include the wails tools
####
!include "wails_tools.nsh"

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support. https://nsis.sourceforge.io/Reference/ManifestDPIAware
ManifestDPIAware true

!include "MUI2.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_ABORTWARNING

# Installer wizard pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

# Finish page options: launch app + optional "Start with Windows"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXECUTABLE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${INFO_PRODUCTNAME}"

!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Start ${INFO_PRODUCTNAME} with Windows"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION EnableAutostart

!insertmacro MUI_PAGE_FINISH

# Uninstaller wizard pages
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Name "${INFO_PRODUCTNAME}"
OutFile "..\..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe"
!if "${WAILS_INSTALL_SCOPE}" == "user"
    InstallDir "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
!else
    InstallDir "$PROGRAMFILES64\${INFO_COMPANYNAME}\${INFO_PRODUCTNAME}"
!endif
ShowInstDetails show

Function .onInit
   !insertmacro wails.checkArchitecture
FunctionEnd

Function EnableAutostart
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ClutterLess" '"$INSTDIR\${PRODUCT_EXECUTABLE}" --hidden'
FunctionEnd

Section
    !insertmacro wails.setShellContext

    !insertmacro wails.webview2runtime

    SetOutPath $INSTDIR
    
    !insertmacro wails.files

    CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols
    
    !insertmacro wails.writeUninstaller
SectionEnd

Section "uninstall" 
    !insertmacro wails.setShellContext

    # Clean up autostart registry entry if set
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ClutterLess"

    # Preserve user configuration and history unless explicitly confirmed
    MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete your ${INFO_PRODUCTNAME} configuration and organization history?$\r$\n$\r$\nClick 'No' to preserve your settings and history logs for future installs." IDNO skip_user_data
    RMDir /r "$APPDATA\cless"
    skip_user_data:

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}" # Remove the WebView2 DataPath

    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
