; This marker exists only after installation. Unpacked builds never update.
!macro customInstall
  FileOpen $0 "$INSTDIR\resources\digimmo-installed" w
  FileWrite $0 "nsis"
  FileClose $0
!macroend
