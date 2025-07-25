# Changelog

All notable changes to the orb-common package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of orb-common package
- Migrated exceptions from common Lambda layer
  - Standard exceptions (OrbError, ValidationError, etc.)
  - Security exceptions (SecurityException, AuthenticationError, etc.)
- Migrated audit functionality from common Lambda layer
  - Audit event types and categories
  - Audit logger with CloudWatch integration
  - State tracking for audit trails
  - Compliance flags and checks
- Created package structure with proper modules
  - exceptions module for all error types
  - audit module for audit logging
  - security module for security utilities
  - utils module for common utilities
- Added comprehensive package metadata and exports
- Created GitHub Actions CI/CD pipeline
- Added Makefile for developer convenience

### Changed
- Converted from Lambda layer structure to proper Python package
- Updated imports to use package namespace (orb_common)

### Fixed
- Resolved circular import issues in compliance module
- Fixed boto3 import handling for development environments

## [0.1.0] - TBD

- Initial release