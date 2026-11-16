#!/bin/bash
D=$(dirname "$0"); OUT=${1:-$D/../index.html}; A=${ASSETS:-$D/../assets}; B=${BUNDLE:-$D/../assets/three-bundle.js}; mkdir -p $(dirname $OUT)
{ cat $D/00-head.html; echo '<script>'; cat $B; echo '</script><script>const MODEL_DATA={'
  for k in rpm:RPM michelle:Michelle xbot:Xbot; do echo -n "${k%%:*}:'"; base64 -w0 $A/${k##*:}.opt.glb; echo "',"; done
  echo '};</script><script>'; cat $D/0[1-9]-*.js; echo '</script></body></html>'; } > $OUT
echo built $OUT $(stat -c %s $OUT)
