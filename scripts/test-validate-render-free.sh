#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT

cp "$repo_root/render.yaml" "$test_dir/render.yaml"
mkdir -p "$test_dir/scripts"
cp "$repo_root/scripts/validate-render-free.sh" "$test_dir/scripts/validate-render-free.sh"
cp "$repo_root/README.md" "$test_dir/README.md"
mkdir -p "$test_dir/docs/operations"
cp "$repo_root/docs/operations/render.md" "$test_dir/docs/operations/render.md"
docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash scripts/validate-render-free.sh

sed -i '/- key: DB_PASSWORD/{n;s/sync: false/sync: false\n        value: hard-coded/;}' "$test_dir/render.yaml"
output_file="$test_dir/validator-output"

set +e
docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash scripts/validate-render-free.sh >"$output_file" 2>&1
validator_status=$?
set -e

if [ "$validator_status" -eq 0 ]; then
  echo "validator accepted a value-backed required secret marked sync: false" >&2
  exit 1
fi

grep -Fqx "required secret must not define a source: DB_PASSWORD" "$output_file"

cp "$repo_root/render.yaml" "$test_dir/render.yaml"
sed -i 's/Aiven/ProviderX/g' "$test_dir/docs/operations/render.md"

set +e
docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash scripts/validate-render-free.sh >"$output_file" 2>&1
validator_status=$?
set -e

if [ "$validator_status" -eq 0 ]; then
  echo "validator accepted a runbook without the required Aiven detail" >&2
  exit 1
fi

grep -Fqx "runbook missing required deployment detail: Aiven" "$output_file"

cp "$repo_root/docs/operations/render.md" "$test_dir/docs/operations/render.md"
sed -i 's/Agency Hub/ProjectX/g' "$test_dir/README.md"

set +e
docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash scripts/validate-render-free.sh >"$output_file" 2>&1
validator_status=$?
set -e

if [ "$validator_status" -eq 0 ]; then
  echo "validator accepted a README without the Agency Hub detail" >&2
  exit 1
fi

grep -Fqx "README missing required deployment detail: Agency Hub" "$output_file"
