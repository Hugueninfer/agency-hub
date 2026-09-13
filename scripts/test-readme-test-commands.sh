#!/usr/bin/env bash
set -euo pipefail

if [ "${README_COMMAND_STUB:-}" = "1" ]; then
  printf '%s:%s\n' "$(basename "$0")" "$PWD"
  exit 0
fi

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT

commands=$(awk '
  /^## Desenvolvimento e testes$/ { in_tests = 1; next }
  in_tests && /^## / { exit }
  in_tests && /^\(cd (api|web) && / { print }
' "$repo_root/README.md")

printf '%s\n' "$commands" | grep -Fqx '(cd api && composer install && php artisan test)'
printf '%s\n' "$commands" | grep -Fqx '(cd web && npm ci && npm test)'

mkdir -p "$test_dir/project/api" "$test_dir/project/web" "$test_dir/bin"
for command in composer php npm; do
  ln -s "$repo_root/scripts/test-readme-test-commands.sh" "$test_dir/bin/$command"
done
mkdir -p "$test_dir/project/scripts"
for command in test-validate-render-free.sh validate-render-free.sh; do
  ln -s "$repo_root/scripts/test-readme-test-commands.sh" "$test_dir/project/scripts/$command"
done

PATH="$test_dir/bin:$PATH" bash -n <<<"$commands"
output=$(cd "$test_dir/project" && README_COMMAND_STUB=1 PATH="$test_dir/bin:$PATH" bash <<<"$commands")
printf '%s\n' "$output" | grep -Fqx "composer:$test_dir/project/api"
printf '%s\n' "$output" | grep -Fqx "php:$test_dir/project/api"
printf '%s\n' "$output" | grep -Fqx "npm:$test_dir/project/web"
