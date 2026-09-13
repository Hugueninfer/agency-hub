#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT

cp "$repo_root/render.yaml" "$test_dir/render.yaml"
cp "$repo_root/scripts/validate-render-free.sh" "$test_dir/validate-render-free.sh"
docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash ./validate-render-free.sh

sed -i '/- key: DB_PASSWORD/{n;s/sync: false/sync: false\n        value: hard-coded/;}' "$test_dir/render.yaml"
output_file="$test_dir/validator-output"

set +e
docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash ./validate-render-free.sh >"$output_file" 2>&1
validator_status=$?
set -e

if [ "$validator_status" -eq 0 ]; then
  echo "validator accepted a value-backed required secret marked sync: false" >&2
  exit 1
fi

grep -Fqx "required secret must not define a source: DB_PASSWORD" "$output_file"
