#!/usr/bin/env bash
# Invinsense Frontend plugin installer for Claude Code, the Claude desktop app, Kiro and Cursor.
# Works on macOS and Linux (bash 3.2+). Needs: git, node 18+.
#
# Usage:
#   ./install.sh                     install for every agent found on this machine
#   ./install.sh claude kiro         install for the named agents only
#   ./install.sh cursor --project    write to the current project instead of your home folder
#   ./install.sh --update            pull the latest plugin, then reinstall
#   ./install.sh --uninstall         remove it from the selected agents
#   ./install.sh --dry-run           show what would change, write nothing
#
# Agents: claude (Claude Code CLI) | desktop (Claude desktop app) | kiro | cursor | all (default: all that are installed)
set -euo pipefail

REPO_URL="${INVINSENSE_REPO_URL:-https://github.com/rohanr-icpl/infopercept-mcp-plugin.git}"
MARKETPLACE="infopercept-tools"
PLUGIN="invinsense-frontend"
SERVER_NAME="invinsense"
# GUI apps start with a minimal PATH, so register node by absolute path.
NODE_BIN="$(command -v node)"
CACHE_DIR="${INVINSENSE_HOME:-$HOME/.infopercept}/infopercept-mcp-plugin"

AGENTS=""; DRY=0; UNINSTALL=0; UPDATE=0; PROJECT=0

say()  { printf '%s\n' "$*"; }
ok()   { if [ "$DRY" = 1 ]; then printf '  dry   %s\n' "$*"; else printf '  ok    %s\n' "$*"; fi; }
skip() { printf '  skip  %s\n' "$*"; }
warn() { printf '  warn  %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then printf '  dry   %s\n' "$*"; else "$@"; fi; }

for a in "$@"; do
  case "$a" in
    claude|desktop|kiro|cursor) AGENTS="$AGENTS $a" ;;
    all) AGENTS="" ;;
    --dry-run) DRY=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --update) UPDATE=1 ;;
    --project) PROJECT=1 ;;
    -h|--help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown option: $a (try --help)" ;;
  esac
done

# ---------- prerequisites ----------
command -v node >/dev/null 2>&1 || die "node is required (18 or newer). Install it from https://nodejs.org and re-run."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "node 18 or newer is required (found $(node -v))."

# ---------- locate the plugin ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
if [ -f "$SCRIPT_DIR/plugins/$PLUGIN/server/index.mjs" ]; then
  REPO_DIR="$SCRIPT_DIR"                        # running from a checkout
else
  command -v git >/dev/null 2>&1 || die "git is required to fetch the plugin."
  REPO_DIR="$CACHE_DIR"
  if [ "$UNINSTALL" = 0 ]; then
    if [ -d "$REPO_DIR/.git" ]; then
      [ "$UPDATE" = 1 ] && { say "Updating $REPO_DIR"; run git -C "$REPO_DIR" pull --ff-only; }
    else
      say "Cloning plugin to $REPO_DIR"
      run mkdir -p "$(dirname "$REPO_DIR")"
      run git clone --depth 1 "$REPO_URL" "$REPO_DIR" || die "clone failed. The repo may be private: sign in with 'gh auth login' or ask for access."
    fi
  fi
fi
if [ "$UPDATE" = 1 ] && [ "$REPO_DIR" = "$SCRIPT_DIR" ] && [ -d "$SCRIPT_DIR/.git" ]; then
  say "Updating $REPO_DIR"; run git -C "$REPO_DIR" pull --ff-only
fi
SERVER="$REPO_DIR/plugins/$PLUGIN/server/index.mjs"
SKILL="$REPO_DIR/plugins/$PLUGIN/skills/invinsense-ui/SKILL.md"
if [ "$UNINSTALL" = 0 ] && [ "$DRY" = 0 ]; then
  [ -f "$SERVER" ] || die "server not found at $SERVER"
  # Smoke check: the server must answer an MCP initialize request.
  REPLY="$(printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"install","version":"0"}}}' \
    | (node "$SERVER" 2>/dev/null & P=$!; sleep 2; kill $P 2>/dev/null; wait $P 2>/dev/null) || true)"
  case "$REPLY" in *'"result"'*) ok "server responds" ;; *) warn "server did not answer a test request. Continuing; check 'node $SERVER'." ;; esac
fi

# ---------- JSON merge helper (keeps every other server in the file) ----------
# usage: json_set <file> <rootKey> <add|remove>
json_set() {
  local file="$1" root="$2" mode="$3"
  if [ "$DRY" = 1 ]; then printf '  dry   %s %s in %s\n' "$mode" "$SERVER_NAME" "$file"; return 0; fi
  mkdir -p "$(dirname "$file")"
  FILE="$file" ROOT="$root" MODE="$mode" SERVER="$SERVER" NAME="$SERVER_NAME" NODE_BIN="$NODE_BIN" node -e '
    const fs = require("fs");
    const { FILE, ROOT, MODE, SERVER, NAME, NODE_BIN } = process.env;
    let cfg = {};
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, "utf8");
      if (raw.trim()) { try { cfg = JSON.parse(raw); } catch (e) { console.error("cannot parse " + FILE + ": " + e.message); process.exit(2); } }
      fs.copyFileSync(FILE, FILE + ".bak");
    }
    cfg[ROOT] = cfg[ROOT] || {};
    if (MODE === "add") cfg[ROOT][NAME] = { command: NODE_BIN, args: [SERVER] };
    else delete cfg[ROOT][NAME];
    fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2) + "\n");
  '
}

want() { [ -z "$AGENTS" ] && return 0; case " $AGENTS " in *" $1 "*) return 0 ;; esac; return 1; }
explicit() { case " $AGENTS " in *" $1 "*) return 0 ;; esac; return 1; }

# ---------- Claude Code ----------
if want claude; then
  say "Claude Code"
  if command -v claude >/dev/null 2>&1; then
    if [ "$UNINSTALL" = 1 ]; then
      run claude plugin uninstall "$PLUGIN@$MARKETPLACE" || skip "plugin was not installed"
      run claude plugin marketplace remove "$MARKETPLACE" || skip "marketplace was not added"
      ok "removed"
    else
      # Prefer the local checkout when there is one, otherwise the GitHub URL.
      SRC="$REPO_URL"; [ "$REPO_DIR" = "$SCRIPT_DIR" ] && SRC="$SCRIPT_DIR"
      run claude plugin marketplace add "$SRC" || skip "marketplace may already be added"
      run claude plugin install "$PLUGIN@$MARKETPLACE" || warn "install failed. Run 'claude plugin list' to check."
      ok "installed. Restart Claude Code, then type /invinsense-frontend: to see the commands"
    fi
  else
    if explicit claude; then warn "claude CLI not found. Install Claude Code first."; else skip "claude CLI not found"; fi
  fi
fi

# ---------- Claude desktop app ----------
if want desktop; then
  say "Claude desktop app"
  case "$(uname -s)" in
    Darwin) DCFG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"; DAPP="/Applications/Claude.app" ;;
    Linux)  DCFG="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json"; DAPP="" ;;
    *)      DCFG="${APPDATA:-$HOME/AppData/Roaming}/Claude/claude_desktop_config.json"; DAPP="" ;;
  esac
  if [ -d "$(dirname "$DCFG")" ] || { [ -n "$DAPP" ] && [ -d "$DAPP" ]; } || explicit desktop; then
    if [ "$UNINSTALL" = 1 ]; then
      [ -f "$DCFG" ] && json_set "$DCFG" mcpServers remove && ok "removed from $DCFG" || skip "nothing to remove"
    else
      json_set "$DCFG" mcpServers add && ok "MCP server added to $DCFG"
      say "  Fully quit Claude (Cmd+Q) and reopen it. The Invinsense tools appear under the tools/connectors menu."
      say "  Slash commands: in Claude > Settings > Plugins > Add, add this marketplace:"
      say "    $REPO_URL"
      say "  then install 'invinsense-frontend' from Discover."
    fi
  else
    skip "Claude desktop app not found (use 'desktop' explicitly to force)"
  fi
fi

# ---------- Kiro ----------
if want kiro; then
  say "Kiro"
  if [ "$PROJECT" = 1 ]; then KCFG="$PWD/.kiro/settings/mcp.json"; KSTEER="$PWD/.kiro/steering"; else KCFG="$HOME/.kiro/settings/mcp.json"; KSTEER="$HOME/.kiro/steering"; fi
  if [ "$PROJECT" = 1 ] || [ -d "$HOME/.kiro" ] || command -v kiro >/dev/null 2>&1 || explicit kiro; then
    if [ "$UNINSTALL" = 1 ]; then
      [ -f "$KCFG" ] && json_set "$KCFG" mcpServers remove && ok "removed from $KCFG" || skip "nothing to remove"
      run rm -f "$KSTEER/invinsense-ui.md"
    else
      json_set "$KCFG" mcpServers add && ok "MCP server added to $KCFG"
      if [ -f "$SKILL" ]; then
        run mkdir -p "$KSTEER"
        if [ "$DRY" = 0 ]; then
          { printf -- '---\ninclusion: always\n---\n\n'; awk 'BEGIN{c=0} /^---[[:space:]]*$/ && c<2 {c++; next} c>=2' "$SKILL"; } > "$KSTEER/invinsense-ui.md"
        fi
        ok "steering rule written to $KSTEER/invinsense-ui.md"
      fi
      say "  Restart Kiro (or reconnect the MCP server) and ask: \"List the Invinsense tools\"."
    fi
  else
    skip "Kiro not found (use 'kiro' explicitly to force)"
  fi
fi

# ---------- Cursor ----------
if want cursor; then
  say "Cursor"
  if [ "$PROJECT" = 1 ]; then CCFG="$PWD/.cursor/mcp.json"; CRULES="$PWD/.cursor/rules"; else CCFG="$HOME/.cursor/mcp.json"; CRULES=""; fi
  if [ "$PROJECT" = 1 ] || [ -d "$HOME/.cursor" ] || command -v cursor >/dev/null 2>&1 || [ -d "/Applications/Cursor.app" ] || explicit cursor; then
    if [ "$UNINSTALL" = 1 ]; then
      [ -f "$CCFG" ] && json_set "$CCFG" mcpServers remove && ok "removed from $CCFG" || skip "nothing to remove"
      [ -n "$CRULES" ] && run rm -f "$CRULES/invinsense-ui.mdc"
    else
      json_set "$CCFG" mcpServers add && ok "MCP server added to $CCFG"
      if [ -n "$CRULES" ] && [ -f "$SKILL" ]; then
        run mkdir -p "$CRULES"
        if [ "$DRY" = 0 ]; then
          { printf -- '---\ndescription: Invinsense Module UI Guide v2.0 rules for module UI and React/Next.js code\nalwaysApply: true\n---\n\n'; awk 'BEGIN{c=0} /^---[[:space:]]*$/ && c<2 {c++; next} c>=2' "$SKILL"; } > "$CRULES/invinsense-ui.mdc"
        fi
        ok "project rule written to $CRULES/invinsense-ui.mdc"
      fi
      say "  Restart Cursor, then check Settings > MCP: 'invinsense' should show a green dot."
    fi
  else
    skip "Cursor not found (use 'cursor' explicitly to force)"
  fi
fi

say ""
if [ "$UNINSTALL" = 1 ]; then say "Done. Restart your agents to finish removing it."; else
  say "Done. In any agent, ask: \"Run score_invinsense_compliance on /abs/path/to/your/project\"."
  [ "$DRY" = 1 ] && say "(dry run: nothing was written)"
fi
