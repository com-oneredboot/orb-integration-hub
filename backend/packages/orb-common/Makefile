# Makefile for orb-common package

.PHONY: help install install-dev test lint format type-check security-check build clean

# Default target
help:
	@echo "Available targets:"
	@echo "  install        - Install the package in production mode (editable)"
	@echo "  install-dev    - Install the package in development mode with test dependencies"
	@echo "  test           - Run tests with coverage"
	@echo "  lint           - Run linting checks (black, isort)"
	@echo "  format         - Format code with black and isort"
	@echo "  type-check     - Run mypy type checking"
	@echo "  security-check - Run security checks with bandit and safety"
	@echo "  build          - Build distribution packages (for testing)"
	@echo "  clean          - Clean build artifacts"

# Installation targets
install:
	pip install -e .

install-dev:
	pip install -e .[test]
	pip install black isort mypy bandit safety

# Testing
test:
	pytest tests/ -v --cov=orb_common --cov-report=term-missing --cov-report=html

# Code quality
lint:
	black --check .
	isort --check-only .

format:
	black .
	isort .

type-check:
	mypy orb_common --ignore-missing-imports

# Security
security-check:
	bandit -r orb_common -ll
	safety check || true

# Build and distribution (for testing purposes only)
build: clean
	python -m build
	@echo "Note: Built packages are for testing only. This package is used internally via editable install."

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

# Note: This package is for internal use only within the monorepo
# No publishing targets are provided

# Development workflow
dev-check: lint type-check security-check test
	@echo "All checks passed!"

# Version management
version:
	@python -c "exec(open('orb_common/__init__.py').read()); print(__version__)"

bump-patch:
	@echo "Current version: $$(make version)"
	@echo "To bump version, edit orb_common/__init__.py"

# Documentation
docs:
	@echo "Documentation generation not yet configured"