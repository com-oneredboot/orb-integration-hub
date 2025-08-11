# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of orb-schema-generator
- Core domain models for Schema, Field, Type, and Operation
- TypeScript generator with duplicate resolution
- Python generator with Pydantic model support
- GraphQL SDL generator
- Advanced duplicate detection and resolution system
- DRY template engine with reusable components
- Command-line interface with Click
- Comprehensive test suite with high coverage
- Plugin architecture for extensibility
- Configuration system with YAML/JSON/TOML support

### Features
- Multi-language code generation (TypeScript, Python, GraphQL)
- Intelligent duplicate type resolution
- Template inheritance and composition
- Configurable naming conventions
- Schema validation and error reporting
- MCP server implementation (planned)

## [0.1.0] - 2025-08-11

### Added
- Initial package structure and configuration
- Basic functionality extracted from monolithic generate.py
- Package configured for AWS CodeArtifact distribution
- GitHub workflow for automated deployment to CodeArtifact