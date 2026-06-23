# Demo recording script for the README GIF.
# Install vhs (https://github.com/charmbracelet/vhs), then run:  vhs demo.tape
# Produces demo.gif. Uses the local build, so run `npm run build` first.

Output demo.gif

Set FontSize 18
Set Width 1280
Set Height 760
Set Padding 18
Set Theme "Dracula"

Type "# hazmat-cfr — the complete 49 CFR hazmat table, cited"
Enter
Sleep 1500ms

Type "# one call: everything you need to ship a material"
Enter
Sleep 1200ms
Type "hazmat-cfr requirements UN1830"
Enter
Sleep 4s

Type "# placard for a hazard class (49 CFR 172.504)"
Enter
Sleep 800ms
Type "hazmat-cfr placard 2.3"
Enter
Sleep 3s

Type "# decode special-provision codes (49 CFR 172.102)"
Enter
Sleep 800ms
Type "hazmat-cfr decode-sp IB2 T8"
Enter
Sleep 3s

Type "# every field traces to a pinned eCFR revision"
Enter
Sleep 2s
