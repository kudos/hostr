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
build: ## Run `yarn run build`
	docker-compose run --rm app yarn run build

.PHONY: test
test: ## Run tests
	docker-compose run --rm app yarn test

.PHONY: logs
logs: ## Tail the app and worker logs
	docker-compose logs -f app worker

.PHONY: migrate
migrate: ## Migrate database schema
	docker-compose run --rm app yarn run initdb

.PHONY: init
init: ## Migrate database schema
	docker-compose run --rm app yarn run init

.PHONY: watch-frontend
watch-frontend: ## Build and watch for changes
	docker-compose run --rm app yarn run watch

.PHONY: docker-compose-up
docker-compose-up: ## Start (and create) docker containers
	docker-compose up -d

.PHONY: yarn
yarn: ## Update yarn dependencies
	docker-compose run --rm app yarn

.PHONY: shell
shell: ## Run shell
	docker-compose run --rm app sh
