"""CLI entry point for E2E Test Generator."""

import argparse
import sys
import logging
from pathlib import Path

from .playwright_generator import PlaywrightGenerator
from .config import E2EConfig


def main() -> int:
    """Main CLI entry point.

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    parser = argparse.ArgumentParser(
        description="Generate Playwright E2E tests from YAML schemas"
    )
    parser.add_argument("command", choices=["generate"], help="Command to execute")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("schema-generator.yml"),
        help="Path to configuration file (default: schema-generator.yml)",
    )
    parser.add_argument(
        "--schema", type=str, help="Generate tests for specific schema only"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned operations without writing files",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    # Configure logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s")

    try:
        # Load configuration
        config = E2EConfig.from_file(args.config)

        # Create generator
        generator = PlaywrightGenerator(config, dry_run=args.dry_run)

        # Generate tests
        generator.generate(schema_filter=args.schema)

        return 0
    except Exception as e:
        logging.error(f"Generation failed: {e}")
        if args.verbose:
            import traceback

            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
