#!/bin/sh
set -eu

ca_path=${MYSQL_ATTR_SSL_CA:-/tmp/agency-hub-aiven-ca.pem}
ca_certificate=${AIVEN_CA_CERT:-}

case "$ca_certificate" in
  *'-----BEGIN CERTIFICATE-----'*'-----END CERTIFICATE-----') ;;
  *)
    echo "[start] AIVEN_CA_CERT must contain a PEM certificate." >&2
    exit 1
    ;;
esac

if ! printf '%s\n' "$ca_certificate" | openssl x509 -noout >/dev/null 2>&1; then
  echo "[start] AIVEN_CA_CERT must contain a PEM certificate." >&2
  exit 1
fi

temporary_path=$(mktemp "${ca_path}.XXXXXX")
trap 'rm -f "$temporary_path"' EXIT HUP INT TERM
umask 077
printf '%s\n' "$ca_certificate" >"$temporary_path"
chmod 600 "$temporary_path"
mv -f "$temporary_path" "$ca_path"
trap - EXIT HUP INT TERM
