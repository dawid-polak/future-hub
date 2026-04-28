export function buildBashInstaller(apiBase: string, companyName: string): string {
  return `#!/usr/bin/env bash
# Future Hub installer (macOS / Linux)
# Usage: curl -fsSL ${apiBase}/api/installer/install.sh | bash
set -e

API_BASE="${apiBase}"
COMPANY_NAME="${companyName}"

color() { printf "\\033[%sm%s\\033[0m" "$1" "$2"; }
ok()    { echo "$(color "1;32" "✓") $1"; }
info()  { echo "$(color "1;34" "ℹ") $1"; }
err()   { echo "$(color "1;31" "✗") $1" >&2; }

if ! command -v curl >/dev/null 2>&1; then
  err "Wymagane: curl. Zainstaluj i sprobuj ponownie."
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  err "Wymagane: jq. Zainstaluj (brew install jq / apt install jq)."
  exit 1
fi

echo
info "Future Hub installer — $COMPANY_NAME"
echo

if [ ! -e /dev/tty ]; then
  err "Brak /dev/tty. Uzyj: bash <(curl -fsSL $API_BASE/api/installer/install.sh)"
  exit 1
fi
printf "Email: "
IFS= read -r EMAIL < /dev/tty
printf "Haslo: "
IFS= read -r -s PASS < /dev/tty
echo
if [ -z "$EMAIL" ] || [ -z "$PASS" ]; then
  err "Email i haslo sa wymagane."
  exit 1
fi

LOGIN_BODY=$(jq -nc --arg e "$EMAIL" --arg p "$PASS" '{email:$e,password:$p}')
LOGIN_RES=$(curl -sS -X POST "$API_BASE/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d "$LOGIN_BODY" 2>/dev/null || true)

ACCESS=$(echo "$LOGIN_RES" | jq -r '.accessToken // empty' 2>/dev/null)
REFRESH=$(echo "$LOGIN_RES" | jq -r '.refreshToken // empty' 2>/dev/null)
USER_NAME=$(echo "$LOGIN_RES" | jq -r '.user.name // empty' 2>/dev/null)

if [ -z "$ACCESS" ]; then
  ERR_MSG=$(echo "$LOGIN_RES" | jq -r '.error // "nieznany blad"' 2>/dev/null)
  err "Logowanie nieudane: $ERR_MSG"
  exit 1
fi
ok "Zalogowano jako $USER_NAME"

WORKDIR="$HOME/$COMPANY_NAME"
SKILLS_DIR="$WORKDIR/skills"
DOCS_DIR="$WORKDIR/docs"
CFG_DIR="$HOME/.config/future-hub"
BIN_DIR="$HOME/.local/bin"
FH_BIN="$BIN_DIR/fh"

mkdir -p "$SKILLS_DIR" "$DOCS_DIR" "$CFG_DIR" "$BIN_DIR"

cat > "$CFG_DIR/config.json" <<JSON
{
  "apiBase": "$API_BASE",
  "companyName": "$COMPANY_NAME",
  "workdir": "$WORKDIR",
  "refreshToken": "$REFRESH"
}
JSON
chmod 600 "$CFG_DIR/config.json"
ok "Konfiguracja zapisana w $CFG_DIR/config.json"

# CLI fh
cat > "$FH_BIN" <<'FHEOF'
#!/usr/bin/env bash
set -e
CFG="$HOME/.config/future-hub/config.json"
[ -f "$CFG" ] || { echo "Brak konfiguracji. Zainstaluj ponownie."; exit 1; }
API=$(jq -r .apiBase "$CFG")
COMPANY=$(jq -r .companyName "$CFG")
REFRESH=$(jq -r .refreshToken "$CFG")
WORKDIR=$(jq -r .workdir "$CFG")
SKILLS="$WORKDIR/skills"

cmd="\${1:-sync}"

refresh_access() {
  local body r
  body=$(jq -nc --arg t "$REFRESH" '{refreshToken:$t}')
  r=$(curl -sS -X POST "$API/api/auth/refresh" \\
    -H "Content-Type: application/json" \\
    -d "$body" 2>/dev/null || true)
  echo "$r" | jq -r '.accessToken // empty'
}

case "$cmd" in
  sync)
    TOK=$(refresh_access)
    if [ -z "$TOK" ]; then
      echo "Token wygasl lub dostep cofniety. Czyszcze katalog."
      rm -rf "$SKILLS"/*.md 2>/dev/null || true
      exit 1
    fi
    DATA=$(curl -fsS "$API/api/installer/skills/me" -H "Authorization: Bearer $TOK")
    if [ -z "$DATA" ] || [ "$DATA" = "null" ]; then
      echo "Brak skili."
      DATA="[]"
    fi
    # Lista aktualnych slugow
    CURRENT=$(echo "$DATA" | jq -r '.[].slug' | sort -u)
    # Usun pliki nieobecne na liscie
    if [ -d "$SKILLS" ]; then
      for f in "$SKILLS"/*.md; do
        [ -e "$f" ] || continue
        slug=$(basename "$f" .md)
        if ! echo "$CURRENT" | grep -qx "$slug"; then
          rm -f "$f"
          echo "  - usuniety: $slug"
        fi
      done
    fi
    # Zapisz/zaktualizuj
    echo "$DATA" | jq -c '.[]' | while read -r row; do
      slug=$(echo "$row" | jq -r .slug)
      content=$(echo "$row" | jq -r .markdown)
      mkdir -p "$SKILLS"
      printf "%s" "$content" > "$SKILLS/$slug.md"
      echo "  + $slug"
    done
    echo "Sync OK ($(echo "$DATA" | jq 'length') skili)"
    ;;
  status)
    echo "API:        $API"
    echo "Firma:      $COMPANY"
    echo "Workdir:    $WORKDIR"
    echo "Skille:     $(ls "$SKILLS"/*.md 2>/dev/null | wc -l | tr -d ' ')"
    ;;
  logout)
    rm -rf "$WORKDIR" "$HOME/.config/future-hub"
    echo "Wyczyszczono."
    ;;
  *)
    echo "Uzycie: fh {sync|status|logout}"
    ;;
esac
FHEOF
chmod +x "$FH_BIN"
ok "CLI 'fh' zainstalowane: $FH_BIN"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    info "Dodaj do PATH: echo 'export PATH=\\"\\$HOME/.local/bin:\\$PATH\\"' >> ~/.bashrc"
    ;;
esac

# Pierwsza synchronizacja
info "Pobieram skille..."
"$FH_BIN" sync

# Auto-sync co 10 min: cron (Linux) / launchd (macOS)
OS=$(uname -s)
if [ "$OS" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/pl.smallhost.futurehub.sync.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<PEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>pl.smallhost.futurehub.sync</string>
  <key>ProgramArguments</key><array><string>$FH_BIN</string><string>sync</string></array>
  <key>StartInterval</key><integer>600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/.config/future-hub/sync.log</string>
  <key>StandardErrorPath</key><string>$HOME/.config/future-hub/sync.err</string>
</dict></plist>
PEOF
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load "$PLIST"
  ok "Auto-sync (launchd) wlaczony — co 10 min"
elif [ "$OS" = "Linux" ]; then
  CRON_LINE="*/10 * * * * $FH_BIN sync >> $CFG_DIR/sync.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v "fh sync" ; echo "$CRON_LINE" ) | crontab -
  ok "Auto-sync (cron) wlaczony — co 10 min"
fi

echo
ok "Gotowe!"
echo "  Katalog:    $WORKDIR"
echo "  Skille:     $SKILLS_DIR"
echo "  Polecenia:  fh sync | fh status | fh logout"
echo
`;
}
