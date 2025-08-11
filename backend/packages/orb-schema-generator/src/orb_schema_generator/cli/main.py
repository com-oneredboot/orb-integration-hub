"""Main CLI entry point for orb-schema-generator."""

import click

from orb_schema_generator import __version__


@click.group()
@click.version_option(version=__version__, prog_name="orb-schema-generator")
@click.pass_context
def cli(ctx):
    """ORB Schema Generator - Generate code from schema definitions.
    
    A flexible schema-driven code generator for TypeScript, Python,
    GraphQL, and CloudFormation with advanced duplicate resolution.
    """
    ctx.ensure_object(dict)


@cli.command()
@click.argument('input_path', type=click.Path(exists=True))
@click.option('--output', '-o', type=click.Path(), default='generated',
              help='Output directory for generated files')
@click.option('--target', '-t', multiple=True,
              type=click.Choice(['typescript', 'python', 'graphql', 'cloudformation', 'all']),
              default=['all'], help='Target languages to generate')
@click.option('--resolve-duplicates/--no-resolve-duplicates', default=True,
              help='Enable automatic duplicate resolution')
def generate(input_path, output, target, resolve_duplicates):
    """Generate code from schema files."""
    click.echo(f"Generating from {input_path} to {output}")
    click.echo(f"Targets: {', '.join(target)}")
    click.echo(f"Duplicate resolution: {'enabled' if resolve_duplicates else 'disabled'}")
    # TODO: Implement generation logic


@cli.command()
@click.argument('input_path', type=click.Path(exists=True))
def validate(input_path):
    """Validate schema files."""
    click.echo(f"Validating schemas in {input_path}")
    # TODO: Implement validation logic


@cli.command()
@click.argument('input_path', type=click.Path(exists=True))
@click.option('--strategy', '-s',
              type=click.Choice(['merge', 'error', 'ignore', 'prefer_first', 'prefer_last']),
              default='merge', help='Duplicate resolution strategy')
@click.option('--output', '-o', type=click.Path(),
              help='Output file for resolution report')
def resolve_duplicates(input_path, strategy, output):
    """Detect and resolve duplicate schemas."""
    click.echo(f"Resolving duplicates in {input_path}")
    click.echo(f"Strategy: {strategy}")
    if output:
        click.echo(f"Report will be saved to: {output}")
    # TODO: Implement duplicate resolution logic


if __name__ == '__main__':
    cli()