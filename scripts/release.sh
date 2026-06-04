#!/bin/bash

# KUI 版本发布脚本
# 用法: ./scripts/release.sh <version>
# 示例: ./scripts/release.sh 0.2.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
  echo -e "${RED}错误: 请提供版本号${NC}"
  echo ""
  echo "用法: ./scripts/release.sh <version>"
  echo "示例: ./scripts/release.sh 0.2.0"
  echo ""
  echo "当前版本号:"
  grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)".*/  tauri.conf.json: \1/'
  grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/  package.json:    \1/'
  exit 1
fi

VERSION="$1"

# 验证版本号格式 (x.y.z)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo -e "${RED}错误: 版本号格式不正确，应为 x.y.z (如 0.2.0)${NC}"
  exit 1
fi

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  KUI 版本发布脚本${NC}"
echo -e "${BLUE}  新版本: v${VERSION}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 更新 src-tauri/tauri.conf.json
echo -e "${YELLOW}[1/6] 更新 src-tauri/tauri.conf.json ...${NC}"
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json
echo -e "${GREEN}  ✓ tauri.conf.json -> ${VERSION}${NC}"

# 2. 更新 package.json
echo -e "${YELLOW}[2/6] 更新 package.json ...${NC}"
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
echo -e "${GREEN}  ✓ package.json -> ${VERSION}${NC}"

# 3. 更新 src-tauri/Cargo.toml
echo -e "${YELLOW}[3/6] 更新 src-tauri/Cargo.toml ...${NC}"
sed -i '' "s/^version = \".*\"/version = \"${VERSION}\"/" src-tauri/Cargo.toml
echo -e "${GREEN}  ✓ Cargo.toml -> ${VERSION}${NC}"

# 4. 更新 SettingsView.tsx 中的版本号显示
echo -e "${YELLOW}[4/6] 更新 src/features/settings/SettingsView.tsx ...${NC}"
sed -i '' "s/kui v[0-9]*\.[0-9]*\.[0-9]*/kui v${VERSION}/" src/features/settings/SettingsView.tsx
echo -e "${GREEN}  ✓ SettingsView.tsx -> kui v${VERSION}${NC}"

# 5. 更新 README.md 中的版本徽章
echo -e "${YELLOW}[5/6] 更新 README 版本徽章 ...${NC}"
sed -i '' "s/version-[0-9]*\.[0-9]*\.[0-9]*/version-${VERSION}/" README.md
sed -i '' "s/version-[0-9]*\.[0-9]*\.[0-9]*/version-${VERSION}/" README_EN.md
echo -e "${GREEN}  ✓ README.md -> ${VERSION}${NC}"
echo -e "${GREEN}  ✓ README_EN.md -> ${VERSION}${NC}"

# 6. 更新 Cargo.lock (重新生成)
echo -e "${YELLOW}[6/6] 更新 Cargo.lock ...${NC}"
if command -v cargo &> /dev/null; then
  (cd src-tauri && cargo update -p kui 2>/dev/null || true)
  echo -e "${GREEN}  ✓ Cargo.lock 已更新${NC}"
else
  echo -e "${YELLOW}  ⚠ 未找到 cargo，跳过 Cargo.lock 更新${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  所有版本号已更新为 v${VERSION}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 询问是否继续 git 操作
echo -e "${YELLOW}接下来将执行以下 git 操作:${NC}"
echo "  1. git add -A"
echo "  2. git commit -m \"release: v${VERSION}\""
echo "  3. git tag v${VERSION}"
echo "  4. git push && git push --tags"
echo ""
read -p "是否继续? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}执行 git 操作...${NC}"
  
  git add -A
  echo -e "${GREEN}  ✓ git add${NC}"
  
  git commit -m "release: v${VERSION}"
  echo -e "${GREEN}  ✓ git commit${NC}"
  
  git tag "v${VERSION}"
  echo -e "${GREEN}  ✓ git tag v${VERSION}${NC}"
  
  git push
  echo -e "${GREEN}  ✓ git push${NC}"
  
  git push --tags
  echo -e "${GREEN}  ✓ git push --tags${NC}"
  
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  🎉 v${VERSION} 发布完成！${NC}"
  echo -e "${GREEN}  GitHub Actions 将自动构建发布包${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo ""
  echo -e "${YELLOW}已跳过 git 操作。你可以手动执行:${NC}"
  echo "  git add -A"
  echo "  git commit -m \"release: v${VERSION}\""
  echo "  git tag v${VERSION}"
  echo "  git push && git push --tags"
fi
