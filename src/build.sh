#!/bin/bash
D=$(dirname "$0"); OUT=${1:-$D/out/index.html}; mkdir -p $(dirname $OUT)
{ cat $D/src/00-head.html; echo '<script>'; cat $D/package/build/three.min.js; echo '</script><script>'; cat $D/src/0[1-9]-*.js; echo '</script></body></html>'; } > $OUT
echo built $OUT $(stat -c %s $OUT)
