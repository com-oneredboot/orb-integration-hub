.PHONY: help install install-dev test test-cov lint format type-check security-check clean build publish

help:
	@echo "Available commands:"
	@echo "  install        Install package in production mode"
	@echo "  install-dev    Install package in development mode with all dependencies"
	@echo "  test           Run tests"
	@echo "  test-cov       Run tests with coverage report"
	@echo "  lint           Run linting checks (black, isort, ruff)"
	@echo "  format         Auto-format code"
	@echo "  type-check     Run type checking with mypy"
	@echo "  security-check Run security checks with bandit"
	@echo "  clean          Clean build artifacts"
	@echo "  build          Build distribution packages"
	@echo "  publish        Publish to PyPI (requires credentials)"

install:
	pip install .

install-dev:
	pip install -e ".[dev,docs]"
	pre-commit install

test:
	pytest

test-cov:
	pytest --cov=orb_schema_generator --cov-report=html --cov-report=term

lint:
	black --check src/ tests/
	isort --check-only src/ tests/
	ruff check src/ tests/

format:
	black src/ tests/
	isort src/ tests/

type-check:
	mypy src/orb_schema_generator

security-check:
	bandit -r src/orb_schema_generator

clean:
	rm -rf build/ dist/ *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .coverage htmlcov/ .pytest_cache/

build: clean
	python -m build

publish: build
	@echo "Publishing to CodeArtifact..."
	@./scripts/publish-to-codeartifact.sh

publish-pypi: build
	@echo "Publishing to PyPI (if needed in future)..."
	python -m twine upload dist/*

# Development workflow
dev: format lint type-check test