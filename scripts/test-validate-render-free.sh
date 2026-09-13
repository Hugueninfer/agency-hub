#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT

mkdir -p "$test_dir/scripts" "$test_dir/docs/operations"

reset_fixture() {
  cp "$repo_root/render.yaml" "$test_dir/render.yaml"
  cp "$repo_root/scripts/validate-render-free.sh" "$test_dir/scripts/validate-render-free.sh"
  cp "$repo_root/README.md" "$test_dir/README.md"
  cp "$repo_root/docs/operations/render.md" "$test_dir/docs/operations/render.md"
}

run_validator() {
  docker run --rm --volume "$test_dir:/workspace:ro" --workdir /workspace ruby:3.4 bash scripts/validate-render-free.sh
}

assert_rejected() {
  local target=$1
  local needle=$2
  local expected=$3
  local output_file="$test_dir/validator-output"
  local validator_status

  reset_fixture
  sed -i "s|${needle}|REMOVED|g" "$test_dir/$target"
  if grep -Fq -- "$needle" "$test_dir/$target"; then
    echo "test mutation did not remove: $needle" >&2
    exit 1
  fi

  set +e
  run_validator >"$output_file" 2>&1
  validator_status=$?
  set -e

  if [ "$validator_status" -eq 0 ]; then
    echo "validator accepted missing requirement: $needle" >&2
    exit 1
  fi

  grep -Fqx "$expected" "$output_file"
}

reset_fixture
run_validator

sed -i '/- key: DB_PASSWORD/{n;s/sync: false/sync: false\n        value: hard-coded/;}' "$test_dir/render.yaml"
output_file="$test_dir/validator-output"
set +e
run_validator >"$output_file" 2>&1
validator_status=$?
set -e
if [ "$validator_status" -eq 0 ]; then
  echo "validator accepted a value-backed required secret marked sync: false" >&2
  exit 1
fi
grep -Fqx "required secret must not define a source: DB_PASSWORD" "$output_file"

while IFS='|' read -r target needle expected; do
  [ -n "$target" ] || continue
  assert_rejected "$target" "$needle" "$expected"
done <<'CASES'
docs/operations/render.md|Aiven MySQL Free|runbook missing required deployment detail: Aiven MySQL Free
docs/operations/render.md|Render Free|runbook missing required deployment detail: Render Free
docs/operations/render.md|1 GB|runbook missing required deployment detail: 1 GB
docs/operations/render.md|spins down after 15 idle minutes|runbook missing required deployment detail: spins down after 15 idle minutes
docs/operations/render.md|wakeup is about one minute|runbook missing required deployment detail: wakeup is about one minute
docs/operations/render.md|ephemeral|runbook missing required deployment detail: ephemeral
docs/operations/render.md|no payment method|runbook missing required deployment detail: no payment method
docs/operations/render.md|php artisan migrate --force|runbook missing required deployment detail: php artisan migrate --force
docs/operations/render.md|aiven-ca.pem|runbook missing required deployment detail: aiven-ca.pem
docs/operations/render.md|/etc/secrets/aiven-ca.pem|runbook missing required deployment detail: /etc/secrets/aiven-ca.pem
docs/operations/render.md|demo uploads are blocked|runbook missing required deployment detail: demo uploads are blocked
docs/operations/render.md|at most five|runbook missing required deployment detail: at most five
docs/operations/render.md|opportunistically|runbook missing required deployment detail: opportunistically
docs/operations/render.md|suspended|runbook missing required deployment detail: suspended
docs/operations/render.md|disabled|runbook missing required deployment detail: disabled
docs/operations/render.md|APP_KEY|runbook missing required secret key: APP_KEY
docs/operations/render.md|DB_HOST|runbook missing required secret key: DB_HOST
docs/operations/render.md|DB_PORT|runbook missing required secret key: DB_PORT
docs/operations/render.md|DB_DATABASE|runbook missing required secret key: DB_DATABASE
docs/operations/render.md|DB_USERNAME|runbook missing required secret key: DB_USERNAME
docs/operations/render.md|DB_PASSWORD|runbook missing required secret key: DB_PASSWORD
docs/operations/render.md|MYSQL_ATTR_SSL_CA|runbook missing required secret key: MYSQL_ATTR_SSL_CA
README.md|Agency Hub|README missing required deployment detail: Agency Hub
README.md|24-hour demo|README missing required deployment detail: 24-hour demo
README.md|Render Free|README missing required deployment detail: Render Free
README.md|Aiven MySQL Free|README missing required deployment detail: Aiven MySQL Free
README.md|PHP 8.4 runtime|README missing required deployment detail: PHP 8.4 runtime
README.md|cd api && php artisan test|README missing required deployment detail: cd api && php artisan test
README.md|https://github.com/Hugueninfer/agency-hub|README missing required deployment detail: https://github.com/Hugueninfer/agency-hub
README.md|demo uploads are blocked|README missing required deployment detail: demo uploads are blocked
CASES

reset_fixture
sed -i '$a\A request can take about 15 minutes to become responsive.' "$test_dir/docs/operations/render.md"
set +e
run_validator >"$output_file" 2>&1
validator_status=$?
set -e
if [ "$validator_status" -eq 0 ]; then
  echo "validator accepted incorrect 15-minute cold-start latency" >&2
  exit 1
fi
grep -Fqx "runbook contains incorrect cold-start latency" "$output_file"
