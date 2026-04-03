#!/usr/bin/env bash
set -euo pipefail

ORANGE=$'\033[38;5;208m'
CYAN=$'\033[38;5;51m'
WHITE=$'\033[97m'
RED=$'\033[38;5;203m'
GREEN=$'\033[38;5;120m'
YELLOW=$'\033[38;5;227m'
PURPLE=$'\033[38;5;141m'
NC=$'\033[0m'
BOLD=$'\033[1m'
DIM=$'\033[2m'

CORE_SCRIPT="$(dirname "$(realpath "$0")")/../core/recipe_engine.sh"
CACHE_DB="$HOME/Just_Orange/core/cache.db"

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  clear
  echo -e "${ORANGE}     ██ ██    ██ ███████ ████████      ██████  ██████   █████  ███    ██  ██████  ███████ ${NC}"
  echo -e "${ORANGE}     ██ ██    ██ ██         ██        ██    ██ ██   ██ ██   ██ ████   ██ ██       ██      ${NC}"
  echo -e "${ORANGE}     ██ ██    ██ ███████    ██        ██    ██ ██████  ███████ ██ ██  ██ ██   ███ █████   ${NC}"
  echo -e "${ORANGE}██   ██ ██    ██      ██    ██        ██    ██ ██   ██ ██   ██ ██  ██ ██ ██    ██ ██      ${NC}"
  echo -e "${ORANGE} █████   ██████  ███████    ██         ██████  ██   ██ ██   ██ ██   ████  ██████  ███████ ${NC}"
  echo -e "${CYAN}                Zero-Decision Recipe Generator${NC}\n"
  echo -e "${YELLOW}${BOLD}OpenAI API Key Required${NC}"
  read -s -p "${CYAN}Enter your key (sk-...): ${NC}" OPENAI_API_KEY
  echo
  [[ -z "$OPENAI_API_KEY" ]] && echo -e "${RED}Key required!${NC}" && exit 1
  export OPENAI_API_KEY
  echo -e "${GREEN}Key loaded!${NC}\n"
  sleep 1.5
fi

view_cached_recipes() {
  local total=$(sqlite3 "$CACHE_DB" "SELECT COUNT(*) FROM recipes;" 2>/dev/null || echo 0)
  [[ $total -eq 0 ]] && echo -e "${YELLOW}No cached recipes yet!${NC}\n" && return 1

  mapfile -t entries < <(sqlite3 "$CACHE_DB" "SELECT rowid, recipe, datetime(ts,'unixepoch','localtime') FROM recipes ORDER BY ts DESC;")

  while true; do
    clear
    echo -e "${ORANGE}${BOLD}Your Cached Recipes ($total total)${NC}\n"

    local i=1
    for line in "${entries[@]}"; do
      IFS='|' read -r id recipe date <<< "$line"

      local ings="?"; local taste="?"; local prep="?"; local eat="?"
      local allergens=""; local exclusions=""

      if [[ "$recipe" == *"Using only these exact ingredients"* ]]; then
        local prompt=$(echo "$recipe" | sed -n '1,/Strict format only:/p' | head -n -1)
        ings=$(echo "$prompt" | grep -o "ingredients: [^.]+" | cut -d' ' -f2- | sed 's/\.$//' | head -1)
        taste=$(echo "$prompt" | grep -o "short .* recipe" | awk '{print $2}')
        prep=$(echo "$prompt" | grep -o "Prep ≤[0-9]\+min" | grep -o "[0-9]\+")
        eat=$(echo "$prompt" | grep -o "eat ≤[0-9]\+min" | grep -o "[0-9]\+")
        allergens=$(echo "$prompt" | grep -o "Skip [^.]+" | head -1 | cut -d' ' -f2- | sed 's/\/$//')
        exclusions=$(echo "$prompt" | grep -o "Skip [^.]+" | tail -1 | cut -d' ' -f2- | sed 's/\/$//')
      fi

      echo -e "${CYAN}${BOLD}$((i++))${NC}) ${PURPLE}${date}${NC}"
      echo -e "${DIM}Ingredients:${NC} ${WHITE}${ings}${NC}"
      echo -e "${DIM}Taste:${NC} ${GREEN}${taste}${NC} • ${DIM}Prep:${NC} ${YELLOW}${prep}m${NC} • ${DIM}Eat:${NC} ${YELLOW}${eat}m${NC}"
      [[ -n "$allergens" && "$allergens" != "none" ]] && echo -e "   ${RED}Avoid: $allergens${NC}"
      [[ -n "$exclusions" && "$exclusions" != "none" ]] && echo -e "   ${RED}Exclude: $exclusions${NC}"
      echo -e "${DIM}────────────────────────────────────────${NC}\n"
    done

    echo -e "${CYAN}Options:${NC} (v) View full • (d) Delete • (r) Refresh • (enter) Back"
    read -n1 -p "${CYAN}>${NC} " opt; echo
    case "$opt" in
      v|V) read -p "${CYAN}Recipe ID:${NC} " vid; [[ "$vid" =~ ^[0-9]+$ ]] && ((vid>=1 && vid<=${#entries[@]})) && sqlite3 "$CACHE_DB" "SELECT recipe FROM recipes WHERE rowid=$(echo "${entries[$((vid-1))]}" | cut -d'|' -f1);" | less ;;
      d|D) read -p "${RED}Delete ID:${NC} " did; [[ "$did" =~ ^[0-9]+$ ]] && ((did>=1 && did<=${#entries[@]})) && sqlite3 "$CACHE_DB" "DELETE FROM recipes WHERE rowid=$(echo "${entries[$((did-1))]}" | cut -d'|' -f1);" && echo -e "${RED}Deleted${NC}"; sleep 1 ;;
      r|R) continue ;;
      *) return ;;
    esac
  done
}

generate_recipe() {
  clear
  echo -e "${ORANGE}     ██ ██    ██ ███████ ████████      ██████  ██████   █████  ███    ██  ██████  ███████ ${NC}"
  echo -e "${ORANGE}     ██ ██    ██ ██         ██        ██    ██ ██   ██ ██   ██ ████   ██ ██       ██      ${NC}"
  echo -e "${ORANGE}     ██ ██    ██ ███████    ██        ██    ██ ██████  ███████ ██ ██  ██ ██   ███ █████   ${NC}"
  echo -e "${ORANGE}██   ██ ██    ██      ██    ██        ██    ██ ██   ██ ██   ██ ██  ██ ██ ██    ██ ██      ${NC}"
  echo -e "${ORANGE} █████   ██████  ███████    ██         ██████  ██   ██ ██   ██ ██   ████  ██████  ███████ ${NC}"
  echo -e "${CYAN}                Zero-Decision Recipe Generator${NC}\n"

  read -e -p "${CYAN}>${NC} Ingredients (comma-separated): " INGREDIENTS_INPUT
  [[ -z "$INGREDIENTS_INPUT" ]] && echo -e "${RED}Required!${NC}" && sleep 2 && return

  echo -e "\n${BOLD}${ORANGE}Prep time:${NC}"
  PS3="${CYAN}>${NC} Choose [1-5]: "
  select opt in "< 5 mins" "5-10 mins" "10-20 mins" "20-30 mins" "> 30 mins"; do
    [[ $REPLY =~ ^[1-5]$ ]] && { PREP=$((REPLY==1?5:REPLY==2?10:REPLY==3?20:REPLY==4?30:60)); break; }
  done

  echo -e "\n${BOLD}${ORANGE}Eat time:${NC}"
  PS3="${CYAN}>${NC} Choose [1-3]: "
  select opt in "While multitasking" "5-10 mins" "15-30 mins"; do
    [[ $REPLY =~ ^[1-3]$ ]] && { EAT=$((REPLY==1?2:REPLY==2?10:25)); break; }
  done

  read -e -p $'\n'"${CYAN}>${NC} Allergens to avoid (optional): " ALLERGENS_INPUT
  read -e -p "${CYAN}>${NC} Other exclusions (optional): " EXCLUSIONS_INPUT

  echo -e "\n${BOLD}${ORANGE}Taste profile:${NC}"
  PS3="${CYAN}>${NC} Choose [1-6]: "
  select opt in "spicy" "sweet" "savory/umami" "sour" "fresh/herby" "mild/neutral"; do
    [[ $REPLY =~ ^[1-6]$ ]] && TASTE="$opt" && break
  done

  clear
  echo -e "${YELLOW}${BOLD}Generating recipe…${NC}\n"
  echo -e "${WHITE}Ingredients:${NC} $INGREDIENTS_INPUT"
  echo -e "${WHITE}Taste:${NC} $TASTE • Prep ≤${PREP}min • Eat ≤${EAT}min${NC}"
  [[ -n "$ALLERGENS_INPUT" ]] && echo -e "${RED}Avoid: $ALLERGENS_INPUT${NC}"
  [[ -n "$EXCLUSIONS_INPUT" ]] && echo -e "${RED}Exclude: $EXCLUSIONS_INPUT${NC}"
  echo

  RECIPE=$("$CORE_SCRIPT" \
    --ingredients "$INGREDIENTS_INPUT" \
    --taste "$TASTE" \
    --prep "$PREP" \
    --eat "$EAT" \
    --allergens "${ALLERGENS_INPUT:-none}" \
    --exclusions "${EXCLUSIONS_INPUT:-none}" 2>/dev/null || true)

  if [[ -z "$RECIPE" || "$RECIPE" == *"error"* ]]; then
    echo -e "${RED}Failed to generate recipe.${NC}"
  else
    clear
    echo -e "${GREEN}${BOLD}Your zero-decision recipe:${NC}\n"
    echo -e "${ORANGE}${BOLD}$(echo "$RECIPE" | head -1)${NC}"
    echo -e "${WHITE}$(echo "$RECIPE" | tail -n +2)${NC}"
    echo -e "\n${DIM}Cached • gpt-4o-mini${NC}\n"
  fi

  CACHED_COUNT=$(sqlite3 "$CACHE_DB" "SELECT COUNT(*) FROM recipes;" 2>/dev/null || echo 0)
  echo -e "${CYAN}You have $CACHED_COUNT recipes cached${NC}"
  read -n1 -p $'\nPress any key...'
}

while true; do
  clear
  CACHED_COUNT=$(sqlite3 "$CACHE_DB" "SELECT COUNT(*) FROM recipes;" 2>/dev/null || echo 0)
  echo -e "${ORANGE}     ██ ██    ██ ███████ ████████      ██████  ██████   █████  ███    ██  ██████  ███████ ${NC}"
  echo -e "${ORANGE}     ██ ██    ██ ██         ██        ██    ██ ██   ██ ██   ██ ████   ██ ██       ██      ${NC}"
  echo -e "${ORANGE}     ██ ██    ██ ███████    ██        ██    ██ ██████  ███████ ██ ██  ██ ██   ███ █████   ${NC}"
  echo -e "${ORANGE}██   ██ ██    ██      ██    ██        ██    ██ ██   ██ ██   ██ ██  ██ ██ ██    ██ ██      ${NC}"
  echo -e "${ORANGE} █████   ██████  ███████    ██         ██████  ██   ██ ██   ██ ██   ████  ██████  ███████ ${NC}"
  echo -e "${CYAN}                Zero-Decision Recipe Generator${NC}\n"
  echo -e "${YELLOW}You have ${GREEN}${BOLD}$CACHED_COUNT${NC}${YELLOW} recipes cached${NC}\n"
  echo -e "${BOLD}${ORANGE}What would you like to do?${NC}"
  echo -e " ${CYAN}1${NC}) Create new recipe"
  echo -e " ${CYAN}2${NC}) View cached recipes (not operational right now)"
  echo -e " ${CYAN}3${NC}) Exit\n"
  read -p "${CYAN}>${NC} Choose [1-3]: " choice
  case "$choice" in
    1) generate_recipe ;;
    2) view_cached_recipes ;;
    3) clear; echo -e "\n${GREEN}Happy cooking!${NC}\n"; exit 0 ;;
    *) echo -e "${RED}Invalid choice${NC}"; sleep 1 ;;
  esac
done