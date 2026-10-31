# Common commands. Run `make help` for the list.
.DEFAULT_GOAL := help
COMPOSE := docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ---- development ----
setup: ## First-time setup: .env, install, start postgres/redis, migrate, seed
	@[ -f .env ] || cp .env.example .env
	pnpm install
	$(MAKE) infra-up migrate seed

install: ## Install dependencies
	pnpm install

infra-up: ## Start postgres and redis (Docker)
	$(COMPOSE) up -d --wait postgres redis

infra-down: ## Stop postgres and redis
	$(COMPOSE) down

dev: ## Run API (:4000) and web (:3000) in watch mode
	pnpm dev

migrate: ## Run database migrations
	pnpm db:migrate

migration-generate: ## Generate a migration from entity changes: make migration-generate name=AddCustomer
	cd apps/api && pnpm migration:generate src/database/migrations/$(name) --esm

migration-revert: ## Revert the last migration
	pnpm --filter api migration:revert

seed: ## Create the admin role and the first admin user (SEED_ADMIN_MOBILE)
	pnpm db:seed

check: ## Lint, typecheck, test and build (local CI)
	./scripts/check.sh

check-e2e: ## check + API e2e tests (needs infra-up)
	./scripts/check.sh --e2e

format: ## Format all files
	pnpm format

## ---- server ----
deploy: ## Build and (re)start everything on the server
	./scripts/deploy.sh

backup: ## Dump database and files into backups/
	./scripts/backup.sh

logs: ## Follow API and web logs
	$(COMPOSE) --profile app logs -f --tail=200 api web

ps: ## Show service status
	$(COMPOSE) --profile app --profile monitoring ps

health: ## Check API readiness (database, Redis, storage) on the server
	@$(COMPOSE) --profile app exec -T api wget -qO- http://127.0.0.1:4000/api/v1/health; echo

## ---- monitoring ----
monitoring-up: ## Start Prometheus, Grafana, Loki, Alertmanager and exporters
	./scripts/monitoring.sh

monitoring-down: ## Stop the monitoring stack (data is kept)
	./scripts/monitoring.sh down

.PHONY: help setup install infra-up infra-down dev migrate migration-generate migration-revert seed check check-e2e format deploy backup logs ps health monitoring-up monitoring-down
