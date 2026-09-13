#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
bootstrap="$repo_root/scripts/bootstrap-aiven-ca.sh"
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
ca_path="$test_dir/aiven-ca.pem"
certificate=$(awk '/-----BEGIN CERTIFICATE-----/{in_certificate=1} in_certificate{print} /-----END CERTIFICATE-----/{exit}' /etc/ssl/certs/ca-certificates.crt)

env AIVEN_CA_CERT="$certificate" MYSQL_ATTR_SSL_CA="$ca_path" "$bootstrap"
test "$(cat "$ca_path")" = "$certificate"
test "$(stat -c '%a' "$ca_path")" = "600"

assert_rejected() {
  local certificate_value=$1
  local output_file="$test_dir/output"
  local status

  rm -f "$ca_path"
  set +e
  env AIVEN_CA_CERT="$certificate_value" MYSQL_ATTR_SSL_CA="$ca_path" "$bootstrap" >"$output_file" 2>&1
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "bootstrap accepted an invalid Aiven CA" >&2
    exit 1
  fi
  grep -Fqx "[start] AIVEN_CA_CERT must contain a PEM certificate." "$output_file"
  if [ -n "$certificate_value" ] && grep -Fq -- "$certificate_value" "$output_file"; then
    echo "bootstrap leaked the invalid certificate value" >&2
    exit 1
  fi
  test ! -e "$ca_path"
}

assert_rejected ''
assert_rejected 'not a PEM certificate'
assert_rejected '-----BEGIN CERTIFICATE-----
not-a-certificate
-----END CERTIFICATE-----'
