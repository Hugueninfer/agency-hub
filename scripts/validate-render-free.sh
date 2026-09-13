#!/usr/bin/env bash
set -euo pipefail
ruby_check=$(cat <<'RUBY'
doc = YAML.safe_load_file("render.yaml", aliases: true)
services = doc.fetch("services")
abort "expected exactly one service" unless services.size == 1
service = services.first
abort "service must be web" unless service["type"] == "web"
abort "service must use free plan" unless service["plan"] == "free"
abort "persistent disk is forbidden" if service.key?("disk")
required = %w[APP_KEY DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD MYSQL_ATTR_SSL_CA]
env_vars = service.fetch("envVars")
required.each do |key|
  matches = env_vars.select { |item| item.is_a?(Hash) && item["key"] == key }
  abort "required secret must be defined exactly once: #{key}" unless matches.size == 1
  item = matches.first
  abort "required secret must be unsynced: #{key}" unless item["sync"] == false
  abort "required secret must not define a source: #{key}" if %w[value fromService generateValue].any? { |source| item.key?(source) }
end
abort "billable service type present" if services.any? { |item| %w[pserv cron worker].include?(item["type"]) }
RUBY
)

if command -v ruby >/dev/null 2>&1; then
  ruby -ryaml -e "$ruby_check"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm --volume "$PWD:/workspace:ro" --workdir /workspace ruby:3.4 ruby -ryaml -e "$ruby_check"
else
  echo "Ruby or Docker is required to validate render.yaml" >&2
  exit 127
fi
