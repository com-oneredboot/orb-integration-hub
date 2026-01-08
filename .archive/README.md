# Archived Files

This directory contains files that have been archived during the repository standardization process.

## schemas/

Legacy schema generation files that have been replaced by `orb-schema-generator`:

- `generate.py` - Original custom schema generator script
- `templates/` - Jinja2 templates used by generate.py
- `test_output.py` - Test file for the legacy generator
- `test_template_fix.py` - Test file for template fixes
- `Pipfile` / `Pipfile.lock` - Dependencies for the legacy generator

These files are kept for reference but are no longer used. The project now uses `orb-schema-generator` configured via `schema-generator.yml` in the project root.

## Migration Date

2026-01-04 (Repository Standardization)
