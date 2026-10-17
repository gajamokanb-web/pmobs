#!/bin/sh
# Rebuild index.html (full page with mobile viewport) from src/.
# Usage: ./build.sh            -> index.html
#        ./build.sh bare FILE  -> body-only version for artifact hosting
cd "$(dirname "$0")/src" || exit 1
body() {
  cat head.html
  printf '\n<script>\nvar D=[];\n'
  cat data1.js data2.js data3.js data4.js data5.js app.js gd*.js jeux.js boot.js
  printf '\n</script>\n'
}
if [ "$1" = "bare" ]; then
  body > "$2"
else
  {
    printf '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
    printf '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    printf '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%%}[hidden]{display:none!important}</style>\n'
    printf '</head>\n<body>\n'
    body
    printf '</body>\n</html>\n'
  } > ../index.html
fi
