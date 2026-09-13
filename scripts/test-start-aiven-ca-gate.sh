#!/usr/bin/env bash
set -euo pipefail

if [ "${START_GATE_BOOTSTRAP_STUB:-}" = "1" ]; then
  exit 97
fi
if [ "${START_GATE_COMMAND_STUB:-}" = "1" ]; then
  exit 0
fi

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
image=${START_GATE_TEST_IMAGE:-agency-hub:task2-review}
valid_key='base64:YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE='

run_start() {
  docker run --rm --user root \
    --env APP_KEY="$valid_key" --env START_GATE_COMMAND_STUB=1 --env START_GATE_BOOTSTRAP_STUB=1 \
    --volume "$repo_root/start.sh:/start.sh:ro" \
    --volume "$repo_root/scripts/test-start-aiven-ca-gate.sh:/test-stub:ro" \
    --volume "$1:/usr/local/bin/bootstrap-aiven-ca.sh:ro" \
    --entrypoint sh "$image" -c '
      mkdir -p /test-bin
      for command in php nginx supervisord; do ln -s /test-stub "/test-bin/$command"; done
      PATH="/test-bin:$PATH" sh /start.sh
    '
}

run_start "$repo_root/scripts/test-start-aiven-ca-gate.sh"

assert_configured_failure() {
  local certificate_value=$1
  local output
  local status

  set +e
  output=$(docker run --rm --user root \
    --env APP_KEY="$valid_key" --env START_GATE_COMMAND_STUB=1 \
    --env MYSQL_ATTR_SSL_CA=/tmp/agency-hub-aiven-ca.pem --env AIVEN_CA_CERT="$certificate_value" \
    --volume "$repo_root/start.sh:/start.sh:ro" \
    --volume "$repo_root/scripts/test-start-aiven-ca-gate.sh:/test-stub:ro" \
    --volume "$repo_root/scripts/bootstrap-aiven-ca.sh:/usr/local/bin/bootstrap-aiven-ca.sh:ro" \
    --entrypoint sh "$image" -c '
      mkdir -p /test-bin
      for command in php nginx supervisord; do ln -s /test-stub "/test-bin/$command"; done
      PATH="/test-bin:$PATH" sh /start.sh
    ' 2>&1)
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "configured startup accepted an invalid Aiven CA" >&2
    exit 1
  fi
  printf '%s\n' "$output" | grep -Fqx "[start] AIVEN_CA_CERT must contain a PEM certificate."
  if [ -n "$certificate_value" ] && printf '%s\n' "$output" | grep -Fq -- "$certificate_value"; then
    echo "configured startup leaked the invalid certificate value" >&2
    exit 1
  fi
}

assert_configured_failure ''
assert_configured_failure 'not a PEM certificate'
