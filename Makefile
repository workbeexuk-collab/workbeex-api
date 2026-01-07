# NextBee Backend - Makefile
# ===========================

.PHONY: help dev prod build stop logs restart migrate seed clean

# Default target
help:
	@echo "NextBee Backend Commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev          - Start development environment"
	@echo "    make dev-logs     - View development logs"
	@echo "    make dev-stop     - Stop development environment"
	@echo ""
	@echo "  Production:"
	@echo "    make prod         - Start production environment"
	@echo "    make prod-logs    - View production logs"
	@echo "    make prod-stop    - Stop production environment"
	@echo "    make build        - Build production images"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate      - Run Prisma migrations (dev)"
	@echo "    make migrate-prod - Run Prisma migrations (prod)"
	@echo "    make seed         - Seed the database"
	@echo "    make studio       - Open Prisma Studio"
	@echo ""
	@echo "  Utilities:"
	@echo "    make restart      - Restart API service"
	@echo "    make clean        - Remove all containers and volumes"
	@echo "    make backup       - Backup PostgreSQL database"

# ===== DEVELOPMENT =====

dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "API: http://localhost:3000"
	@echo "Prisma Studio: http://localhost:5555"
	@echo "MinIO Console: http://localhost:9001"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f api

dev-stop:
	docker-compose -f docker-compose.dev.yml down

# ===== PRODUCTION =====

prod:
	docker-compose up -d
	@echo "Production environment started!"

prod-logs:
	docker-compose logs -f

prod-stop:
	docker-compose down

build:
	docker-compose build --no-cache

# ===== DATABASE =====

migrate:
	docker-compose -f docker-compose.dev.yml exec api npx prisma migrate dev

migrate-prod:
	docker-compose exec api npx prisma migrate deploy

seed:
	docker-compose -f docker-compose.dev.yml exec api npx prisma db seed

studio:
	docker-compose -f docker-compose.dev.yml exec api npx prisma studio

# ===== UTILITIES =====

restart:
	docker-compose restart api

restart-dev:
	docker-compose -f docker-compose.dev.yml restart api

clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose down -v
	docker system prune -f
	@echo "All containers and volumes removed!"

backup:
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres nextbee > backups/nextbee_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Database backup created!"

# ===== SSL =====

ssl-init:
	docker-compose run --rm certbot certonly --webroot \
		--webroot-path=/var/www/certbot \
		-d api.nextbee.com -d files.nextbee.com

ssl-renew:
	docker-compose run --rm certbot renew
