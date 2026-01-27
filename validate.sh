#!/bin/bash

# Validation script for Commute System
# Checks if all components are properly set up

echo "🔍 Commute System Validation Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Check Node.js
echo "Checking prerequisites..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        pass "Node.js $NODE_VERSION (required: 18+)"
    else
        fail "Node.js $NODE_VERSION (required: 18+)"
    fi
else
    fail "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    pass "npm $NPM_VERSION"
else
    fail "npm not found"
fi

echo ""
echo "Checking project structure..."

# Check directories
directories=(
    "apps/web"
    "apps/desktop"
    "packages/shared"
    ".github/workflows"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        pass "Directory exists: $dir"
    else
        fail "Directory missing: $dir"
    fi
done

echo ""
echo "Checking web application..."

# Check web app files
web_files=(
    "apps/web/package.json"
    "apps/web/next.config.js"
    "apps/web/tailwind.config.js"
    "apps/web/app/layout.tsx"
    "apps/web/app/page.tsx"
    "apps/web/.env.local.example"
)

for file in "${web_files[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done

# Check if dependencies installed
if [ -d "apps/web/node_modules" ]; then
    pass "Web dependencies installed"
else
    warn "Web dependencies not installed (run: cd apps/web && npm install)"
fi

# Check environment configuration
if [ -f "apps/web/.env.local" ]; then
    pass "Environment configured (.env.local)"
else
    warn "Environment not configured (copy .env.local.example to .env.local)"
fi

echo ""
echo "Checking desktop application..."

# Check desktop app files
desktop_files=(
    "apps/desktop/package.json"
    "apps/desktop/main.js"
    "apps/desktop/preload.js"
    "apps/desktop/electron-builder.yml"
)

for file in "${desktop_files[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done

# Check if desktop dependencies installed
if [ -d "apps/desktop/node_modules" ]; then
    pass "Desktop dependencies installed"
else
    warn "Desktop dependencies not installed (run: cd apps/desktop && npm install)"
fi

echo ""
echo "Checking shared package..."

# Check shared files
shared_files=(
    "packages/shared/package.json"
    "packages/shared/types.ts"
    "packages/shared/constants.ts"
    "packages/shared/index.ts"
)

for file in "${shared_files[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done

echo ""
echo "Checking GitHub Actions workflows..."

# Check workflow files
workflow_files=(
    ".github/workflows/deploy-web.yml"
    ".github/workflows/build-desktop.yml"
)

for file in "${workflow_files[@]}"; do
    if [ -f "$file" ]; then
        pass "Workflow exists: $file"
    else
        fail "Workflow missing: $file"
    fi
done

echo ""
echo "Checking documentation..."

# Check documentation files
doc_files=(
    "README.md"
    "DEPLOYMENT.md"
    "QUICKSTART.md"
    ".env.example"
    "apps/web/README.md"
    "apps/web/SETUP.md"
    "apps/desktop/README.md"
)

for file in "${doc_files[@]}"; do
    if [ -f "$file" ]; then
        pass "Documentation: $file"
    else
        fail "Documentation missing: $file"
    fi
done

# Check face-api models
echo ""
echo "Checking face recognition models..."
if [ -d "apps/web/public/models" ]; then
    MODEL_COUNT=$(ls -1 apps/web/public/models/*.json 2>/dev/null | wc -l)
    if [ "$MODEL_COUNT" -ge 3 ]; then
        pass "Face-API models found ($MODEL_COUNT JSON files)"
    else
        warn "Face-API models not downloaded (see QUICKSTART.md)"
    fi
else
    warn "Models directory not found"
fi

# Test build (optional)
echo ""
if [ "$1" == "--test-build" ]; then
    echo "Testing web app build..."
    cd apps/web
    if npm run build &> /dev/null; then
        pass "Web app builds successfully"
        if [ -d "out" ]; then
            pass "Static export generated"
        else
            fail "Static export not found"
        fi
    else
        fail "Web app build failed"
    fi
    cd ../..
fi

# Summary
echo ""
echo "===================================="
echo "Summary:"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure .env.local in apps/web/"
    echo "2. Setup Supabase database (see apps/web/SETUP.md)"
    echo "3. Download face-API models (see QUICKSTART.md)"
    echo "4. Run: cd apps/web && npm run dev"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi
