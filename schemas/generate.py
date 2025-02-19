# files: schemas/generate.py
# author: Corey Dale Peters
# date: 2025-02-19
# description: This file is used to generate the TypeScript and Python models from the schema files
# defined in index.yml.

# Standard library imports
import os
import sys
import logging
from pathlib import Path

# 3rd party imports
import yaml
from jinja2 import Template

# Set up logging
logger = logging.getLogger('schema_generator')
logger.setLevel(logging.INFO)

# Create handlers
console_handler = logging.StreamHandler(sys.stdout)
file_handler = logging.FileHandler('schema_generator.log')

# Create formatters and add to handlers
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
console_handler.setFormatter(logging.Formatter(log_format))
file_handler.setFormatter(logging.Formatter(log_format))

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)


def load_template(template_path):
    """
    Load a template from the templates directory.

    :param template_path: Path to the template file
    :return: Template content as string
    :raises FileNotFoundError: If template file doesn't exist
    :raises Exception: For any other errors during file reading
    """
    try:
        with open(template_path, 'r') as file:
            template_content = file.read()
            logger.debug("Successfully loaded template: %s", template_path)
            return template_content
    except FileNotFoundError:
        logger.error("Template file not found: %s", template_path)
        raise
    except Exception as e:
        logger.error("Error loading template %s: %s", template_path, str(e))
        raise


def load_schema(schema_path):
    """
    Load and parse a YAML schema file.

    :param schema_path: Path to the schema file
    :return: Parsed schema as dictionary
    :raises yaml.YAMLError: If schema contains invalid YAML
    :raises FileNotFoundError: If schema file doesn't exist
    :raises Exception: For any other errors during file reading or parsing
    """
    try:
        with open(schema_path, 'r') as file:
            schema = yaml.safe_load(file)
            logger.debug("Successfully loaded schema from %s", schema_path)
            return schema
    except FileNotFoundError:
        logger.error("Schema file not found: %s", schema_path)
        raise
    except yaml.YAMLError as e:
        logger.error("Invalid YAML in schema %s: %s", schema_path, str(e))
        raise
    except Exception as e:
        logger.error("Error loading schema %s: %s", schema_path, str(e))
        raise


def load_index():
    """
    Load the index.yml file which contains the registry of all schemas.

    :return: Parsed index as dictionary
    :raises: Various exceptions handled by load_schema()
    """
    logger.info("Loading schema registry from index.yml")
    return load_schema('index.yml')


def generate_typescript_model(table_name, schema_path):
    """
    Generate TypeScript model from schema.

    Reads the schema, applies the TypeScript template, and writes
    the result to the appropriate location in the frontend directory.

    :param table_name: Name of the table/model to generate
    :param schema_path: Path to the schema file
    :return: Boolean indicating success or failure
    """
    logger.info("Starting TypeScript model generation for '%s'", table_name)

    try:
        # Load the schema file
        schema = load_schema(schema_path)
        logger.debug("Loaded schema with %d models", len(schema.get('models', {})))

        # Convert table_name to proper model name (capitalize first letter)
        model_name = table_name.capitalize()

        # Extract the model
        if 'models' not in schema or model_name not in schema['models']:
            logger.error("Schema missing required 'models.%s' section", model_name)
            return False

        model = schema['models'][model_name]
        logger.debug("%s model has %d attributes", model_name, len(model.get('attributes', {})))

        # Load the TypeScript template
        template_path = 'templates/typescript_model.jinja'
        ts_template = load_template(template_path)

        # Render the template with model data
        ts_code = Template(ts_template).render(
            model_name=model_name,
            attributes=model['attributes']
        )
        logger.debug("Successfully rendered TypeScript template")

        # Prepare output location - create file name based on table name
        output_dir = Path('../frontend/src/app/core/models')
        output_file = output_dir / f"{table_name}.model.ts"

        # Ensure directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.debug("Ensured output directory exists: %s", output_dir)

        # Write the generated code to file
        with open(output_file, 'w') as f:
            f.write(ts_code)

        logger.info("TypeScript model successfully generated: %s", output_file)
        return True

    except KeyError as e:
        logger.error("Schema missing required key: %s", str(e))
        return False
    except Exception as e:
        logger.error("Error generating TypeScript model for '%s': %s", table_name, str(e), exc_info=True)
        return False


def generate_python_model(table_name, schema_path):
    """
    Generate Python model from schema.

    Reads the schema, applies the Python template, and writes
    the result to the appropriate location in the backend directory.

    :param table_name: Name of the table/model to generate
    :param schema_path: Path to the schema file
    :return: Boolean indicating success or failure
    """
    logger.info("Starting Python model generation for '%s'", table_name)

    try:
        # Load the schema file
        schema = load_schema(schema_path)
        logger.debug("Loaded schema with %d models", len(schema.get('models', {})))

        # Convert table_name to proper model name (capitalize first letter)
        model_name = table_name.capitalize()

        # Extract the model
        if 'models' not in schema or model_name not in schema['models']:
            logger.error("Schema missing required 'models.%s' section", model_name)
            return False

        model = schema['models'][model_name]
        logger.debug("%s model has %d attributes", model_name, len(model.get('attributes', {})))

        # Load the Python template
        template_path = 'templates/python_model.jinja'
        py_template = load_template(template_path)

        # Render the template with model data
        py_code = Template(py_template).render(
            model_name=model_name,
            attributes=model['attributes']
        )
        logger.debug("Successfully rendered Python template")

        # Prepare output location
        output_dir = Path('../backend/src/models')
        output_file = output_dir / f"{table_name}.py"

        # Ensure directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.debug("Ensured output directory exists: %s", output_dir)

        # Write the generated code to file
        with open(output_file, 'w') as f:
            f.write(py_code)

        logger.info("Python model successfully generated: %s", output_file)
        return True

    except KeyError as e:
        logger.error("Schema missing required key: %s", str(e))
        return False
    except Exception as e:
        logger.error("Error generating Python model for '%s': %s", table_name, str(e), exc_info=True)
        return False


def main():
    """
    Main function - loads the index and generates models for all tables.

    :return: None
    """
    logger.info("=============== SCHEMA GENERATION STARTED ===============")

    try:
        # Load the schema registry from index.yml
        index = load_index()

        if 'schemaRegistry' not in index or 'tables' not in index['schemaRegistry']:
            logger.error("Invalid index.yml: missing schemaRegistry.tables section")
            sys.exit(1)

        tables = index['schemaRegistry']['tables']
        logger.info("Found %d tables in schema registry", len(tables))

        # Track successful generations
        success_count_ts = 0
        success_count_py = 0
        failed_tables = []

        # Process each table in the registry
        for table in tables:
            table_name = table.get('name')
            schema_path = table.get('path')

            if not table_name or not schema_path:
                logger.warning("Skipping invalid table entry: %s", table)
                continue

            logger.info("Processing table: %s (schema: %s)", table_name, schema_path)

            # Generate TypeScript model
            ts_success = generate_typescript_model(table_name, schema_path)
            if ts_success:
                success_count_ts += 1

            # Generate Python model
            py_success = generate_python_model(table_name, schema_path)
            if py_success:
                success_count_py += 1

            # Track failed generations
            if not (ts_success and py_success):
                failed_tables.append(table_name)

        # Report results
        total_tables = len(tables)
        logger.info("=============== GENERATION SUMMARY ===============")
        logger.info("Total tables processed: %d", total_tables)
        logger.info("TypeScript models generated: %d of %d", success_count_ts, total_tables)
        logger.info("Python models generated: %d of %d", success_count_py, total_tables)

        if failed_tables:
            logger.error("Failed generations for tables: %s", ", ".join(failed_tables))
            logger.error("=============== SCHEMA GENERATION COMPLETED WITH ERRORS ===============")
            sys.exit(1)
        else:
            logger.info("=============== SCHEMA GENERATION COMPLETED SUCCESSFULLY ===============")
            sys.exit(0)

    except Exception as e:
        logger.error("Unexpected error during schema generation: %s", str(e), exc_info=True)
        logger.error("=============== SCHEMA GENERATION FAILED ===============")
        sys.exit(1)


if __name__ == "__main__":
    main()