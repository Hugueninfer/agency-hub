#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ruby_check=$(cat <<'RUBY'
repo_root = ARGV.fetch(0)
doc = YAML.safe_load_file("render.yaml", aliases: true)
services = doc.fetch("services")
abort "expected exactly one service" unless services.size == 1
service = services.first
abort "service must be web" unless service["type"] == "web"
abort "service must use free plan" unless service["plan"] == "free"
abort "persistent disk is forbidden" if service.key?("disk")
abort "max shutdown delay is unsupported on Render Free" if service.key?("maxShutdownDelaySeconds")
required = %w[APP_KEY DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD AIVEN_CA_CERT]
env_vars = service.fetch("envVars")
required.each do |key|
  matches = env_vars.select { |item| item.is_a?(Hash) && item["key"] == key }
  abort "required secret must be defined exactly once: #{key}" unless matches.size == 1
  item = matches.first
  abort "required secret must be unsynced: #{key}" unless item["sync"] == false
  abort "required secret must not define a source: #{key}" if %w[value fromService generateValue].any? { |source| item.key?(source) }
end
ssl_ca = env_vars.select { |item| item.is_a?(Hash) && item["key"] == "MYSQL_ATTR_SSL_CA" }
abort "MYSQL_ATTR_SSL_CA must be defined exactly once" unless ssl_ca.size == 1
abort "MYSQL_ATTR_SSL_CA must use the fixed non-secret runtime path" unless ssl_ca.first == { "key" => "MYSQL_ATTR_SSL_CA", "value" => "/tmp/agency-hub-aiven-ca.pem" }
abort "billable service type present" if services.any? { |item| %w[pserv cron worker].include?(item["type"]) }

runbook = File.read(File.join(repo_root, "docs/operations/render.md"))
[
  "Aiven MySQL Free",
  "Render Free",
  "1 GB",
  "spins down after 15 idle minutes",
  "wakeup is about one minute",
  "ephemeral",
  "no payment method",
  "php artisan migrate --force",
  "Aiven CA PEM",
  "/tmp/agency-hub-aiven-ca.pem",
  "demo uploads are blocked",
  "at most five",
  "opportunistically",
  "suspended",
  "disabled"
].each do |detail|
  abort "runbook missing required deployment detail: #{detail}" unless runbook.include?(detail)
end
abort "runbook contains incorrect cold-start latency" if runbook.include?("request can take about 15 minutes to become responsive")
required.each do |key|
  abort "runbook missing required secret key: #{key}" unless runbook.include?(key)
end

environment_example = File.read(File.join(repo_root, ".env.render.example"))
abort "environment example must declare AIVEN_CA_CERT blank" unless environment_example.include?("AIVEN_CA_CERT=\n")
abort "environment example must use the fixed non-secret runtime path" unless environment_example.include?("MYSQL_ATTR_SSL_CA=/tmp/agency-hub-aiven-ca.pem\n")

readme = File.read(File.join(repo_root, "README.md"))
[
  "Agency Hub",
  "24-hour demo",
  "Render Free",
  "Aiven MySQL Free",
  "PHP 8.4 runtime",
  "(cd api && composer install && php artisan test)",
  "(cd web && npm ci && npm test)",
  "https://github.com/Hugueninfer/agency-hub",
  "demo uploads are blocked"
].each do |detail|
  abort "README missing required deployment detail: #{detail}" unless readme.include?(detail)
end
RUBY
)

if command -v ruby >/dev/null 2>&1; then
  ruby -ryaml -e "$ruby_check" "$repo_root"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm --volume "$repo_root:/workspace:ro" --workdir /workspace ruby:3.4 ruby -ryaml -e "$ruby_check" /workspace
else
  echo "Ruby or Docker is required to validate render.yaml" >&2
  exit 127
fi
