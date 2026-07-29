#!/bin/zsh
# 把桌面机构搜索关键词 CSV 同步到 bridge/kwdata（launchd 后台读不到桌面，故需前台同步）
cp ~/Desktop/数据统计/*搜索关键词*.csv "$(dirname "$0")/kwdata/" 2>/dev/null
echo "synced $(ls "$(dirname "$0")/kwdata/"/*.csv | wc -l | tr -d ' ') keyword CSVs"
