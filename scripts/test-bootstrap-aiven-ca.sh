#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
image=${CA_BOOTSTRAP_TEST_IMAGE:-agency-hub:task2-review}
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
chmod 755 "$test_dir"
certificate=$(awk '/-----BEGIN CERTIFICATE-----/{in_certificate=1} in_certificate{print} /-----END CERTIFICATE-----/{exit}' /etc/ssl/certs/ca-certificates.crt)
ca_path=/workspace/aiven-ca.pem

run_bootstrap() {
  docker run --rm --user root \
    --env AIVEN_CA_CERT --env MYSQL_ATTR_SSL_CA="$ca_path" \
    --volume "$repo_root/scripts/bootstrap-aiven-ca.sh:/bootstrap-aiven-ca.sh:ro" \
    --volume "$test_dir:/workspace" \
    --entrypoint sh "$image" -c /bootstrap-aiven-ca.sh
}

AIVEN_CA_CERT="$certificate" run_bootstrap
docker run --rm --user root --volume "$test_dir:/workspace:ro" --entrypoint sh "$image" -c '
  test "$(stat -c %U:%G:%a /workspace/aiven-ca.pem)" = "www-data:www-data:640"
  su -s /bin/sh www-data -c "openssl x509 -in /workspace/aiven-ca.pem -noout"
'

rm -f "$test_dir/aiven-ca.pem"
AIVEN_CA_CERT="base64:$(printf '%s' "$certificate" | base64 | tr -d '\n')" run_bootstrap
docker run --rm --user root --volume "$test_dir:/workspace:ro" --entrypoint sh "$image" -c '
  test "$(stat -c %U:%G:%a /workspace/aiven-ca.pem)" = "www-data:www-data:640"
  su -s /bin/sh www-data -c "openssl x509 -in /workspace/aiven-ca.pem -noout"
'

assert_rejected() {
  local certificate_value=$1
  local output_file="$test_dir/output"
  local status

  rm -f "$test_dir/aiven-ca.pem"
  set +e
  AIVEN_CA_CERT="$certificate_value" run_bootstrap >"$output_file" 2>&1
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
  test ! -e "$test_dir/aiven-ca.pem"
}

assert_rejected ''
assert_rejected 'not a PEM certificate'
assert_rejected '-----BEGIN CERTIFICATE-----
not-a-certificate
-----END CERTIFICATE-----'
