#!/bin/zsh
# 人生账本 · 本地启动脚本
#
# 为什么要起一个本地服务器，而不能直接双击 index.html：
# 浏览器只在 http(s) 下才允许页面写入 IndexedDB，
# 而 index.html 用的是 ES Module，file:// 协议下也会被直接拦掉。
# 两个限制叠加的结果就是白屏，所以这里用一条命令把服务器起起来。

cd "$(dirname "$0")" || exit 1
echo -ne "\033]0;人生账本\007"

# 1. 找一个没被占用的端口
PORT=""
for candidate in 5177 5178 5179 5180 5181 5182; do
  if ! /usr/bin/nc -z 127.0.0.1 "$candidate" >/dev/null 2>&1; then
    PORT="$candidate"
    break
  fi
done

if [ -z "$PORT" ]; then
  echo "端口 5177-5182 都被占用了，请先关闭其他本地服务再试。"
  echo "按回车键退出。"
  read -r _
  exit 1
fi

# 2. 找一个可用的静态服务器
if command -v python3 >/dev/null 2>&1; then
  SERVER="python3"
elif [ -x /usr/bin/python3 ]; then
  SERVER="/usr/bin/python3"
elif command -v ruby >/dev/null 2>&1; then
  SERVER="ruby"
else
  SERVER=""
fi

if [ -z "$SERVER" ]; then
  echo "没有找到 python3 或 ruby，无法启动本地服务器。"
  echo "可以打开「终端」执行下面这行来安装命令行工具："
  echo "    xcode-select --install"
  echo "按回车键退出。"
  read -r _
  exit 1
fi

echo ""
echo "  人生账本"
echo "  ─────────────────────────────────"
echo "  地址：http://localhost:$PORT"
echo "  关闭：在这个窗口里按 Control + C"
echo ""
echo "  浏览器如果没有自动打开，把这个地址复制进去即可。"
echo ""

# 3. 稍等一秒再打开浏览器，确保服务已经起来
( sleep 1; open "http://localhost:$PORT" ) &

if [ "$SERVER" = "ruby" ]; then
  ruby -run -e httpd . -p "$PORT"
else
  "$SERVER" -m http.server "$PORT"
fi

echo ""
echo "服务器已停止。"
