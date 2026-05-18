; CC-Box NSIS Installer Hooks
; Windows 资源管理器右键菜单注册

!macro NSIS_HOOK_POSTINSTALL
  ; 右键文件夹："使用 CC-Box 打开"
  WriteRegStr HKCU "Software\Classes\Directory\shell\cc-box" "" "使用 CC-Box 打开"
  WriteRegStr HKCU "Software\Classes\Directory\shell\cc-box" "Icon" "$INSTDIR\cc-box.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\cc-box\command" "" '"$INSTDIR\cc-box.exe" "%1"'

  ; 右键空白处："在此处打开 CC-Box"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\cc-box" "" "在此处打开 CC-Box"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\cc-box" "Icon" "$INSTDIR\cc-box.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\cc-box\command" "" '"$INSTDIR\cc-box.exe" "%V"'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; 移除右键菜单注册表项
  DeleteRegKey HKCU "Software\Classes\Directory\shell\cc-box"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\cc-box"
!macroend
