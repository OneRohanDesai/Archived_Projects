#!/usr/bin/env bash
set -euo pipefail

MODEL="gpt-4o-mini"
MAX_TOKENS=150
CACHE_DB="$HOME/Just_Orange/core/cache.db"
RETRIES=3
TIMEOUT=15

json_error() {
  jq -n --arg msg "$1" '{"error": $msg}'
  exit 1
}

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  if [[ -t 0 ]] && [[ "$0" == *recipe_engine.sh ]]; then
    read -s -p $'\nEnter OpenAI API Key (sk-...): ' OPENAI_API_KEY
    echo
    [[ -z "$OPENAI_API_KEY" ]] && json_error "API key required"
    export OPENAI_API_KEY
  else
    json_error "OPENAI_API_KEY not set"
  fi
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    --ingredients) INGREDIENTS="$2"; shift 2 ;;
    --taste)       TASTE="${2:-mild}"; shift 2 ;;
    --prep)        PREP="$2"; shift 2 ;;
    --eat)         EAT="$2"; shift 2 ;;
    --allergens)   ALLERGENS="${2:-none}"; shift 2 ;;
    --exclusions)  EXCLUSIONS="${2:-none}"; shift 2 ;;
    *) json_error "Unknown argument: $1" ;;
  esac
done

[[ -z "${INGREDIENTS:-}" || -z "${PREP:-}" || -z "${EAT:-}" ]] && json_error "Missing required args"

INGREDIENTS_RAW="$INGREDIENTS"
INGREDIENTS=$(printf '%s' "$INGREDIENTS" | sed 's/"/\\"/g')
TASTE=$(printf '%s' "${TASTE:-mild}" | sed 's/"/\\"/g')
ALLERGENS=$(printf '%s' "${ALLERGENS:-none}" | tr ',' '/')
EXCLUSIONS=$(printf '%s' "${EXCLUSIONS:-none}" | tr ',' '/')

CACHE_KEY=$(printf "%s|%s|%s|%s|%s|%s" "$INGREDIENTS" "$TASTE" "$PREP" "$EAT" "$ALLERGENS" "$EXCLUSIONS" | sha256sum | awk '{print $1}')

mkdir -p "$(dirname "$CACHE_DB")"
sqlite3 "$CACHE_DB" "CREATE TABLE IF NOT EXISTS recipes(
  hash TEXT PRIMARY KEY,
  ingredients TEXT,
  taste TEXT,
  prep INTEGER,
  eat INTEGER,
  allergens TEXT,
  exclusions TEXT,
  recipe TEXT,
  ts INTEGER
);"

CACHED=$(sqlite3 "$CACHE_DB" "SELECT recipe FROM recipes WHERE hash='$CACHE_KEY' AND recipe IS NOT NULL;")
if [[ -n "$CACHED" ]]; then
  printf '%s\n' "$CACHED"
  exit 0
fi

PROMPT="Using only these exact ingredients: $INGREDIENTS. Create one very short $TASTE recipe. Prep ≤${PREP}min, ready to eat ≤${EAT}min. Never add anything else. Skip $ALLERGENS. Skip $EXCLUSIONS. Strict format only: Ingredients (quantities):\\n- item (qty)\\n- item (qty)\\nSteps:\\n1. Step one.\\n2. Step two.\\n3. Serve."

for i in $(seq 1 $RETRIES); do
  RESPONSE=$(curl -s --fail-with-body --max-time "$TIMEOUT" \
    https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
      "model": "'"$MODEL"'",
      "messages": [{"role": "user", "content": "'"$PROMPT"'"}],
      "max_tokens": '"$MAX_TOKENS"',
      "temperature": 0.3
    }')

  RECIPE=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty')
  if [[ -n "$RECIPE" && "$RECIPE" != "null" ]]; then
    sqlite3 "$CACHE_DB" "INSERT OR REPLACE INTO recipes VALUES(
      '$CACHE_KEY',
      '$(printf '%s' "$INGREDIENTS_RAW" | sed "s/'/''/g")',
      '$(printf '%s' "$TASTE" | sed "s/'/''/g")',
      $PREP,
      $EAT,
      '$(printf '%s' "${ALLERGENS:-none}" | sed "s/'/''/g")',
      '$(printf '%s' "${EXCLUSIONS:-none}" | sed "s/'/''/g")',
      '$(printf '%s' "$RECIPE" | sed "s/'/''/g")',
      $(date +%s)
    );"

    printf '%s\n' "$RECIPE"
    exit 0
  fi
  sleep $((i * 2))
done

ERR=$(echo "$RESPONSE" | jq -r '.error.message // "unknown error"')
json_error "API failed: $ERR"