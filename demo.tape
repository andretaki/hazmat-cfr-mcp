# Demo recording script for the README GIF.
# Install vhs (https://github.com/charmbracelet/vhs), then run:  vhs demo.tape
# Produces demo.gif. Uses the local build, so run `npm run build` first.

Output demo.gif

Set FontSize 18
Set Width 1280
Set Height 760
Set Padding 18
Set Theme "Dracula"

Type "# hazmat-cfr — the complete 49 CFR 172.101 table, cited"
Enter
Sleep 1500ms

Type "hazmat-cfr lookup UN1090"
Enter
Sleep 3s

Type "hazmat-cfr decode-sp IB2 T8"
Enter
Sleep 3s

Type 'hazmat-cfr validate "UN1830, Sulfuric acid, 8, PG II"'
Enter
Sleep 3500ms

Type "# every field traces to a pinned eCFR revision"
Enter
Sleep 2s
