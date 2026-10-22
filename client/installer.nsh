; This marker is written by Setup and also added to the extracted ZIP so both copies update in place.
!macro customInstall
  FileOpen $0 "$INSTDIR\resources\digimmo-installed" w
  FileWrite $0 "nsis"
  FileClose $0
!macroend
