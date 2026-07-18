#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C.UTF-8

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

targets=()
for dir in app/src supabase docs; do
  if [ -d "$root_dir/$dir" ]; then
    targets+=("$root_dir/$dir")
  fi
done

if [ ${#targets[@]} -eq 0 ]; then
  exit 0
fi

if grep -rPn "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" "${targets[@]}"; then
  echo "Emoji detected. Spec forbids emojis anywhere."
  exit 1
fi
exit 0
