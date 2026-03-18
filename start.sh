#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}"
echo "  ____             _____ _               "
echo " |  _ \  ___   ___|  ___| | _____      __"
echo " | | | |/ _ \ / __| |_  | |/ _ \ \ /\ / /"
echo " | |_| | (_) | (__|  _| | | (_) \ V  V / "
echo " |____/ \___/ \___|_|   |_|\___/ \_/\_/  "
echo -e "${NC}"

# ── Check runtimes ──────────────────────────────────────────────────────────

if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found. Install it from https://nodejs.org${NC}"
  exit 1
fi

PYTHON=""
for cmd in python3 python; do
  if command -v "$cmd" &>/dev/null; then
    PYTHON="$cmd"
    break
  fi
done
if [ -z "$PYTHON" ]; then
  echo -e "${RED}✗ Python not found. Install it from https://python.org${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node $(node -v)   Python $($PYTHON --version 2>&1 | cut -d' ' -f2)${NC}"

# ── Node dependencies ───────────────────────────────────────────────────────

echo -e "\n${YELLOW}Checking Node dependencies...${NC}"
[ ! -d "$ROOT/node_modules" ]         && npm install --prefix "$ROOT" -s
[ ! -d "$ROOT/backend/node_modules" ] && npm install --prefix "$ROOT/backend" -s && echo "  backend installed"
[ ! -d "$ROOT/frontend/node_modules" ] && npm install --prefix "$ROOT/frontend" -s && echo "  frontend installed"
echo -e "${GREEN}✓ Node dependencies ready${NC}"

# ── Python dependencies ─────────────────────────────────────────────────────

echo -e "\n${YELLOW}Checking Python dependencies...${NC}"
$PYTHON -m pip install -r "$ROOT/requirements.txt" -q --disable-pip-version-check
echo -e "${GREEN}✓ Python dependencies ready${NC}"

# ── spaCy model ─────────────────────────────────────────────────────────────

echo -e "\n${YELLOW}Checking spaCy French model...${NC}"
if ! $PYTHON -c "import fr_core_news_sm" 2>/dev/null; then
  echo "  Downloading fr_core_news_sm (one-time)..."
  $PYTHON -m spacy download fr_core_news_sm -q
fi
echo -e "${GREEN}✓ spaCy model ready${NC}"

# ── Optional: warn about Tesseract ──────────────────────────────────────────

if ! command -v tesseract &>/dev/null; then
  echo -e "\n${YELLOW}⚠  Tesseract not found on PATH — OCR will use stub responses.${NC}"
  echo    "   Set TESSERACT_PATH in .env if you install it later."
fi

# ── Start all services ──────────────────────────────────────────────────────

echo -e "\n${GREEN}Starting all services...${NC}"
echo    "  BACKEND  → http://localhost:3001"
echo    "  FRONTEND → http://localhost:3000"
echo    "  OCR      → http://localhost:5001"
echo    "  NER      → http://localhost:5002"
echo ""

npx concurrently \
  --names "BACKEND,FRONTEND,OCR,NER" \
  --prefix-colors "cyan,magenta,yellow,green" \
  --kill-others-on-fail \
  "npm run dev --prefix backend" \
  "npm run dev --prefix frontend" \
  "cd ocr-service && $PYTHON app.py" \
  "cd services/ner-service && $PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
