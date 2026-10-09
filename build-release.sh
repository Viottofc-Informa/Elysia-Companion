#!/bin/bash
# Elysia Companion - Build and Release Script
# This script compiles TypeScript, creates VSIX, and prepares for GitHub release

set -e

echo "=========================================="
echo "  Elysia Companion v0.2.0 - Release Build"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify directory
echo -e "${CYAN}Step 1: Verifying project directory...${NC}"
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the extension root."
    exit 1
fi
echo -e "${GREEN}✓ Project directory OK${NC}"

# Step 2: Clean previous builds
echo -e "${CYAN}Step 2: Cleaning previous builds...${NC}"
rm -rf out/
rm -f *.vsix
echo -e "${GREEN}✓ Cleaned${NC}"

# Step 3: Install dependencies
echo -e "${CYAN}Step 3: Installing dependencies...${NC}"
npm install --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Compile TypeScript
echo -e "${CYAN}Step 4: Compiling TypeScript...${NC}"
npm run compile
echo -e "${GREEN}✓ TypeScript compiled${NC}"

# Step 5: Check if vsce is available
echo -e "${CYAN}Step 5: Checking vsce CLI...${NC}"
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js."
    exit 1
fi

# Install vsce if not present
if ! npx vsce --version &> /dev/null; then
    echo "Installing vsce..."
    npm install -g @vscode/vsce
fi
echo -e "${GREEN}✓ vsce is available${NC}"

# Step 6: Create VSIX
echo -e "${CYAN}Step 6: Creating VSIX package...${NC}"
npx vsce package --no-dependencies
echo -e "${GREEN}✓ VSIX created${NC}"

# Step 7: Move to releases folder
echo -e "${CYAN}Step 7: Moving to releases folder...${NC}"
mkdir -p releases
mv *.vsix releases/
echo -e "${GREEN}✓ Moved to releases/${NC}"

# Step 8: List final files
echo -e "${CYAN}Step 8: Final artifacts...${NC}"
ls -lh releases/*.vsix

# Step 9: Git add and commit
echo -e "${CYAN}Step 9: Preparing GitHub release...${NC}"
echo -e "${YELLOW}Run the following commands to push to GitHub:${NC}"
echo ""
echo "git add -A"
echo "git commit -m 'Release v0.2.0: Compression Stats tab with detailed metrics'"
echo "git tag v0.2.0"
echo "git push origin main --tags"
echo ""
echo "Then create release on GitHub:"
echo "https://github.com/Viottofc-Informa/Elysia-Companion/releases/new?tag=v0.2.0"
echo ""

echo "=========================================="
echo -e "${GREEN}✓ Build Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${CYAN}VSIX Location:${NC} releases/elysia-companion-0.2.0.vsix"
echo -e "${CYAN}Install with:${NC} code --install-extension releases/elysia-companion-0.2.0.vsix"
echo ""
