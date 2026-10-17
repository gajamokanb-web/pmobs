#!/bin/sh
# Rebuild index.html from the sources in src/
cd "$(dirname "$0")/src" && {
  cat head.html
  printf '\n<script>\nvar D=[];\n'
  cat data1.js data2.js data3.js data4.js app.js
  printf '\n</script>\n'
} > ../index.html
