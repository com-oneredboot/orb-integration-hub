# Makefile for orb-models package

.PHONY: help install install-dev test lint format type-check clean generate

# Default target
help:
	@echo "Available targets:"
	@echo "  install      - Install the package in production mode (editable)"
	@echo "  install-dev  - Install the package in development mode with test dependencies"
	@echo "  generate     - Run generate.py to create models and enums"
	@echo "  test         - Run tests with coverage"
	@echo "  lint         - Run linting checks (black, isort)"
	@echo "  format       - Format code with black and isort"
	@echo "  type-check   - Run mypy type checking"
	@echo "  clean        - Clean build artifacts and generated files"

# Installation targets
install:
	pip install -e .

install-dev:
	pip install -e .[test,dev]

# Generation
generate:
	@echo "Running generate.py to create models..."
	cd ../../../schemas && python generate.py

# Testing
test:
	pytest tests/ -v --cov=orb_models --cov-report=term-missing --cov-report=html

# Code quality
lint:
	black --check orb_models/
	isort --check-only orb_models/

format:
	black orb_models/
	isort orb_models/

type-check:
	mypy orb_models --ignore-missing-imports

# Clean
clean:
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	# Note: We don't clean generated files as they're needed

# Development workflow
dev-check: lint type-check test
	@echo "All checks passed!"

# Version management
version:
	@python -c "exec(open('orb_models/__init__.py').read()); print(__version__)"