#!/bin/zsh
# 改完代码跑一下：给所有本地资源续版本号，绕过 CF 边缘缓存
V=$(date +%s)
perl -pi -e "s/(src|href)=\"(src\/[^\"?]+|manifest\.webmanifest|assets\/icon\.svg)(\?v=\d+)?\"/\$1=\"\$2?v=$V\"/g" index.html
echo "bumped to v=$V"
