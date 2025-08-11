# Schema Generator: Design Document

## Executive Summary

This document outlines the design for refactoring the current monolithic `generate.py` script into a standalone, reusable Python package that can be distributed via PyPI and potentially exposed as an MCP (Model Context Protocol) server.

## Goals

1. **Eliminate DRY violations**: Centralize all operation building and duplicate detection logic
2. **Improve maintainability**: Follow SOLID principles with clear separation of concerns
3. **Create reusable package**: Standalone Python package for use across projects
4. **Enable MCP integration**: Expose functionality through MCP server interface
5. **Maintain backward compatibility**: Ensure current project continues to work

## Current State Problems

### DRY Violations
- Query generation logic duplicated between `build_crud_operations_for_table` and `generate_typescript_lambda_graphql_ops`
- Duplicate checking implemented separately in multiple places
- Auth directive logic scattered across functions
- GraphQL query templates hardcoded in Python

### Architectural Issues
- Monolithic functions (183+ lines) with multiple responsibilities
- Business logic mixed with file I/O
- Logic in Jinja templates that should be in Python
- No clear domain models or interfaces
- Poor testability due to side effects

### Specific Problems
- TypeScript model generation creates duplicate types because it uses raw schema data instead of processed operations
- Templates contain business logic (auth directive merging, type conversions)
- No unified processing pipeline

## Proposed Architecture

### Package Structure

```
schema-generator/
├── pyproject.toml                  # Package configuration
├── README.md
├── LICENSE
├── src/
│   └── schema_generator/
│       ├── __init__.py
│       ├── __main__.py            # CLI entry point
│       ├── core/
│       │   ├── models.py          # Domain models
│       │   ├── builders.py        # Operation builders
│       │   ├── processors.py      # Schema processors
│       │   ├── resolvers.py       # Duplicate resolvers
│       │   └── validators.py      # Schema validators
│       ├── generators/
│       │   ├── typescript.py      # TypeScript generation
│       │   ├── python.py          # Python generation
│       │   ├── graphql.py         # GraphQL generation
│       │   └── cloudformation.py  # CloudFormation generation
│       ├── templates/             # Default templates
│       ├── cli.py                # CLI interface
│       ├── api.py                # Programmatic API
│       └── mcp/
│           └── server.py         # MCP server implementation
├── tests/
└── examples/
```

### Core Components

#### 1. Domain Models (`core/models.py`)
```python
@dataclass
class Operation:
    name: str
    type: OperationType
    graphql_query: str
    input_types: List[str]
    response_types: List[str]
    auth_directives: List[str]
    index_name: Optional[str] = None

@dataclass
class Schema:
    name: str
    type: SchemaType
    attributes: List[Attribute]
    primary_key: Key
    secondary_indexes: List[Index]
    custom_queries: List[CustomQuery]
    auth_config: AuthConfig
```

#### 2. Operation Builder (`core/builders.py`)
```python
class OperationBuilder:
    def build_all_operations(self, schema: Schema) -> OperationSet:
        """Build all operations with deduplication"""
        # Centralized operation building logic
```

#### 3. Schema Processor (`core/processors.py`)
```python
class SchemaProcessor:
    def process_schema(self, schema_path: str) -> ProcessedSchema:
        """Single pipeline for processing a schema"""
        # Load, validate, build operations, generate types
```

#### 4. Type Generator (`generators/typescript.py`)
```python
class TypeScriptGenerator:
    def generate_types_from_operations(self, operations: OperationSet) -> str:
        """Generate TypeScript types from operations (no duplicates)"""
```

### Public API

```python
from schema_generator import SchemaGenerator, GeneratorConfig

config = GeneratorConfig(
    schema_dir="./schemas/entities",
    output_dir="./generated",
    template_dir="./custom_templates"
)

generator = SchemaGenerator(config)
generator.generate_all()
```

### CLI Interface

```bash
# Generate from schemas
schema-generator generate ./schemas/entities --output ./generated

# Validate schemas
schema-generator validate ./schemas/entities

# Inspect operations
schema-generator inspect ./schemas/entities/OrganizationUsers.yml
```

### MCP Server Interface

```python
Tools:
- generate_schema: Generate code from schema
- validate_schema: Validate schema syntax
- list_operations: List all operations for a schema
- analyze_duplicates: Find duplicate operations
```

## Implementation Phases

### Phase 1: Core Extraction (Week 1)
- Extract domain models
- Create OperationBuilder with centralized logic
- Implement DuplicateResolver
- Create SchemaProcessor pipeline

### Phase 2: Generator Refactoring (Week 1-2)
- Extract TypeScript generation
- Extract Python generation
- Extract GraphQL generation
- Remove logic from templates

### Phase 3: Package Creation (Week 2)
- Set up package structure
- Create public API
- Implement CLI with Click
- Write comprehensive tests

### Phase 4: MCP Integration (Week 3)
- Implement MCP server
- Add async support
- Create MCP documentation

### Phase 5: Migration (Week 3-4)
- Update current project to use package
- Ensure backward compatibility
- Deploy to PyPI

## Success Criteria

1. **No duplicate types** in generated TypeScript models
2. **All logic in Python**, templates only for presentation
3. **Comprehensive test coverage** (>80%)
4. **Clean API** that's easy to use
5. **Full backward compatibility** with current project
6. **Published PyPI package**
7. **Working MCP server**

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking current functionality | Comprehensive testing, gradual migration |
| Template compatibility | Maintain template interface, version templates |
| Performance regression | Profile and optimize critical paths |
| Complex migration | Phase approach, maintain old code during transition |

## Future Enhancements

1. **Plugin system** for custom generators
2. **Schema visualization** tools
3. **Migration utilities** for schema changes
4. **IDE integrations** (VS Code extension)
5. **Web UI** for schema management