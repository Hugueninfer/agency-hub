#!/usr/bin/env bash
set -euo pipefail
ruby -ryaml -e '
doc = YAML.safe_load_file("render.yaml", aliases: true)
services = doc.fetch("services")
abort "expected exactly one service" unless services.size == 1
service = services.first
abort "service must be web" unless service["type"] == "web"
abort "service must use free plan" unless service["plan"] == "free"
abort "persistent disk is forbidden" if service.key?("disk")
keys = service.fetch("envVars").filter_map { |item| item["key"] }
required = %w[APP_KEY DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD MYSQL_ATTR_SSL_CA]
abort "missing unsynced secrets" unless (required - keys).empty?
abort "billable service type present" if services.any? { |item| %w[pserv cron worker].include?(item["type"]) }
'
