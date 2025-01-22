.PHONY: setup test clean venv env check-prereqs

# Use bash instead of sh
SHELL := /bin/bash

# Variables
VENV_NAME=venv
PYTHON=$(VENV_NAME)/bin/python
PIP=$(VENV_NAME)/bin/pip
NODE_MODULES=node_modules

# Check for required programs
check-prereqs:
	@echo "🔍 Checking prerequisites..."
	@which python3 > /dev/null || (echo "❌ Python3 is not installed. Please install it first." && exit 1)
	@which npm > /dev/null || (echo "❌ npm is not installed. Please install Node.js and npm first:\n   sudo apt-get install nodejs npm" && exit 1)
	@echo "✅ All prerequisites are installed"

# Default target
all: setup

# Create Python virtual environment and install dependencies
setup: check-prereqs env $(VENV_NAME) node_modules install-browsers
	@echo "✅ Setup complete!"

# Create .env file if it doesn't exist
env:
	@if [ ! -f .env ]; then \
		echo "⚠️  No .env file found. Creating from .env.example..."; \
		cp .env.example .env; \
		echo "⚠️  Please edit .env with your actual webhook URL"; \
	fi

# Only create venv if it doesn't exist
$(VENV_NAME):
	@echo "🔧 Creating Python virtual environment..."
	python3 -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip
	$(PIP) install pytest python-dotenv
	@echo "✅ Python virtual environment created"

node_modules: package.json
	@echo "🔧 Installing Node.js dependencies..."
	npm install
	@echo "✅ Node.js dependencies installed"

# Install Playwright browsers
install-browsers:
	@echo "🔧 Installing Playwright browsers..."
	npx playwright install firefox
	@echo "✅ Playwright browsers installed"

# Run tests
test: env
	@echo "🧪 Running tests..."
	@if [ ! -f .env ]; then \
		echo "❌ No .env file found. Please run 'make setup' first."; \
		exit 1; \
	fi
	@if [ ! -d "node_modules" ]; then \
		echo "❌ Node modules not found. Please run 'make setup' first."; \
		exit 1; \
	fi
	@echo "🔧 Running tests with environment configuration..."
	@set -a && source .env && set +a && \
	npm test

# Clean everything
clean:
	@echo "🧹 Cleaning up..."
	rm -rf $(VENV_NAME)
	rm -rf node_modules
	rm -rf test-results
	rm -rf playwright-report
	rm -rf playwright/.cache
	rm -rf firefox-profile
	rm -rf web-ext-artifacts
	@echo "✅ Cleanup complete"

# Development environment
dev: env
	@echo "🚀 Starting development environment..."
	@if [ ! -d "node_modules" ]; then \
		echo "❌ Node modules not found. Please run 'make setup' first."; \
		exit 1; \
	fi
	@set -a && source .env && set +a && \
	npm run dev 