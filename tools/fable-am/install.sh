#!/bin/bash
# Fable-aM installer (macOS). Symlinks the extension into the user CEP folder
# and enables PlayerDebugMode so AE loads the unsigned panel.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/fable-am"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
ln -s "$SRC" "$DEST"

# Unsigned-extension flag for every CSXS version AE 2020+ may use
for v in 9 10 11 12; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1
done

echo "Installed: $DEST -> $SRC"
echo "Restart After Effects, then: Window > Extensions > Fable-aM"
