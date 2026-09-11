#!/bin/zsh
# 人生账本 · 发布到 GitHub
#
# 这个脚本要在「终端」里运行（不是聊天窗口），因为 git 推送需要访问 github.com，
# 也需要用你自己的 GitHub 账号授权。
#
# 用法：双击本文件，按提示输入即可。

set -e
cd "$(dirname "$0")" || exit 1
echo -ne "\033]0;发布人生账本到 GitHub\007"

blue()  { printf "\033[38;5;67m%s\033[0m\n" "$1"; }
green() { printf "\033[38;5;71m%s\033[0m\n" "$1"; }
warn()  { printf "\033[38;5;173m%s\033[0m\n" "$1"; }

clear
echo ""
blue "  人生账本 · 发布到 GitHub"
echo "  ────────────────────────────────────────"
echo ""

# ---------- 0. 环境检查 ----------
if ! command -v git >/dev/null 2>&1; then
  warn "没有找到 git。"
  echo "  在终端执行下面这行安装命令行工具，然后再运行本脚本："
  echo "      xcode-select --install"
  echo ""
  read -r "?按回车键退出。"
  exit 1
fi

if [ ! -d .git ]; then
  echo "初始化本地仓库…"
  git init -b main >/dev/null
fi

if ! git config user.name >/dev/null 2>&1 || [ -z "$(git config user.name || true)" ]; then
  echo ""
  echo "第一次提交需要一个署名（会出现在提交记录里）。"
  read -r "?  你的名字: " GIT_NAME
  read -r "?  你的邮箱: " GIT_EMAIL
  git config --local user.name "$GIT_NAME"
  git config --local user.email "$GIT_EMAIL"
fi

# ---------- 1. 提交 ----------
if [ -n "$(git status --porcelain)" ]; then
  echo ""
  echo "提交本地改动…"
  git add -A
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git commit -m "更新" >/dev/null
  else
    git commit -m "人生账本：首个版本" >/dev/null
  fi
  green "  已提交。"
fi

# 如果初始化提交是用占位署名做的，改成你自己的
FIRST_AUTHOR_EMAIL="$(git log --reverse --format=%ae | head -1)"
if [ "$FIRST_AUTHOR_EMAIL" = "you@example.com" ]; then
  git commit --amend --reset-author --no-edit >/dev/null 2>&1 || true
  green "  已把首个提交的作者改成你。"
fi

# ---------- 2. 仓库信息 ----------
echo ""
blue "接下来需要你在 GitHub 上建一个空仓库"
echo "  1) 打开 https://github.com/new"
echo "  2) Repository name 填一个名字（例如 lifeledger）"
echo "  3) 不要勾选 Add a README / .gitignore / license"
echo "  4) 点 Create repository"
echo ""

DEFAULT_NAME="$(basename "$PWD")"
read -r "?你的 GitHub 用户名: " GH_USER
read -r "?仓库名（回车默认 $DEFAULT_NAME）: " GH_REPO
GH_REPO="${GH_REPO:-$DEFAULT_NAME}"

if [ -z "$GH_USER" ]; then
  warn "没有输入用户名，退出。"
  exit 1
fi

REMOTE="https://github.com/$GH_USER/$GH_REPO.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

echo ""
echo "推送目标：$REMOTE"
echo ""
echo "如果弹出登录窗口，用 GitHub 账号登录；"
echo "GitHub 现在不接受账号密码，密码处要填 Personal Access Token。"
echo "没有的话去这里生成一个（勾选 repo 权限）："
echo "    https://github.com/settings/tokens/new"
echo ""
read -r "?准备好了就按回车开始推送。"

echo ""
if git push -u origin main; then
  echo ""
  green "  推送成功！"
  echo ""
  echo "  仓库地址： https://github.com/$GH_USER/$GH_REPO"
  echo ""
  echo "  想让它变成一个真正的网址（可以在手机上用、可以装到桌面）："
  echo "    打开 https://github.com/$GH_USER/$GH_REPO/settings/pages"
  echo "    → Source 选 “GitHub Actions”"
  echo "    → 然后到 Actions 页面点一次 Run workflow"
  echo "    → 一两分钟后网址是： https://$GH_USER.github.io/$GH_REPO/"
  echo ""
  open "https://github.com/$GH_USER/$GH_REPO" >/dev/null 2>&1 || true
else
  echo ""
  warn "  推送失败。"
  echo "  常见原因：仓库还没建、用户名或仓库名写错、没有权限。"
  echo "  重新运行本脚本可以再试一次。"
  echo ""
fi

read -r "?按回车键关闭。"
