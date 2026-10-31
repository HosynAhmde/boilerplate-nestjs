# Sourced by the other scripts. Reads KEY=VALUE lines from .env into the
# environment WITHOUT executing the file, so values with spaces or Persian
# text (SEED_ADMIN_FULL_NAME=مدیر سیستم) cannot break the scripts.
load_env() {
  local file="${1:-.env}" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    # strip one pair of surrounding quotes
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    # variables already set in the shell win, like docker compose does
    [ -n "${!key+x}" ] || export "$key=$value"
  done < "$file"
}
