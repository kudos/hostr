# See http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
.PHONY: help
help:
	@echo
	@echo "Commands:"
	@grep -E -h '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "See README.md"
	@echo

.PHONY: build
build: ## Run `pnpm run build`
	podman compose run --rm app pnpm run build

.PHONY: test
test: ## Run tests
	podman compose run --rm app pnpm test

.PHONY: logs
logs: ## Tail the app and worker logs
	podman compose logs -f app worker

.PHONY: migrate
migrate: ## Migrate database schema
	podman compose run --rm app pnpm run initdb

.PHONY: init
init: ## Migrate database schema
	podman compose run --rm app pnpm run init

.PHONY: watch-frontend
watch-frontend: ## Build and watch for changes
	podman compose run --rm app pnpm run watch

.PHONY: podman compose-up
podman compose-up: ## Start (and create) docker containers
	podman compose up -d

.PHONY: install
install: ## Install dependencies
	podman compose run --rm app pnpm install

.PHONY: shell
shell: ## Run shell
	podman compose run --rm app sh
