#!/bin/sh
set -eu

ca_path=${MYSQL_ATTR_SSL_CA:-/tmp/agency-hub-aiven-ca.pem}
ca_certificate=${AIVEN_CA_CERT:-}

invalid_certificate() {
  echo "[start] AIVEN_CA_CERT must contain a PEM certificate." >&2
  exit 1
}

case "$ca_certificate" in
  base64:*)
    ca_certificate=$(printf '%s' "${ca_certificate#base64:}" | base64 -d 2>/dev/null) || invalid_certificate
    ;;
esac

case "$ca_certificate" in
  *'-----BEGIN CERTIFICATE-----'*'-----END CERTIFICATE-----') ;;
  *) invalid_certificate ;;
esac

if ! printf '%s\n' "$ca_certificate" | openssl x509 -noout >/dev/null 2>&1; then
  invalid_certificate
fi

temporary_path=$(mktemp "${ca_path}.XXXXXX")
trap 'rm -f "$temporary_path"' EXIT HUP INT TERM
umask 077
printf '%s\n' "$ca_certificate" >"$temporary_path"
chown www-data:www-data "$temporary_path"
chmod 640 "$temporary_path"
mv -f "$temporary_path" "$ca_path"
trap - EXIT HUP INT TERM
