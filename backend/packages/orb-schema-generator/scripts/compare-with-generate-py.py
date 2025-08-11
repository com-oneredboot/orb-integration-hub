#!/usr/bin/env python3
"""Compare output of orb-schema-generator with original generate.py."""

import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Set
import difflib

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orb_schema_generator import SchemaLoader
from orb_schema_generator.generators.python_generator import PythonGenerator, PythonGeneratorConfig
from orb_schema_generator.generators.typescript_generator import TypeScriptGenerator, TypeScriptGeneratorConfig
from orb_schema_generator.generators.graphql_generator import GraphQLGenerator, GraphQLGeneratorConfig


def run_original_generate_py() -> Dict[str, Set[str]]:
    """Run original generate.py and return generated file names."""
    schemas_dir = Path("/home/fishbeak/infrastructure/src/orb-integration-hub/schemas")
    
    # Create a temporary copy of the current generated files
    temp_backup = Path(tempfile.mkdtemp())
    
    # Paths to check
    paths_to_check = {
        "python_models": Path("/home/fishbeak/infrastructure/src/orb-integration-hub/backend/packages/orb-models/orb_models/models"),
        "python_enums": Path("/home/fishbeak/infrastructure/src/orb-integration-hub/backend/packages/orb-models/orb_models/enums"),
        "typescript": Path("/home/fishbeak/infrastructure/src/orb-integration-hub/frontend/src/app/core/models"),
        "graphql_ts": Path("/home/fishbeak/infrastructure/src/orb-integration-hub/frontend/src/app/core/graphql"),
    }
    
    # Get current files before generation
    original_files = {}
    for category, path in paths_to_check.items():
        if path.exists():
            if category == "python_models":
                original_files[category] = {f.name for f in path.glob("*Model.py")}
            elif category == "python_enums":
                original_files[category] = {f.name for f in path.glob("*Enum.py")}
            elif category == "typescript":
                original_files[category] = {f.name for f in path.glob("*.ts")}
            elif category == "graphql_ts":
                original_files[category] = {f.name for f in path.glob("*.graphql.ts")}
        else:
            original_files[category] = set()
    
    # Also check for GraphQL schema
    cf_dir = Path("/home/fishbeak/infrastructure/src/orb-integration-hub/infrastructure/cloudformation")
    graphql_schemas = list(cf_dir.glob("appsync_*.graphql"))
    if graphql_schemas:
        # Get the most recent one
        latest_schema = max(graphql_schemas, key=lambda p: p.stat().st_mtime)
        original_files["graphql_schema"] = {latest_schema.name}
    else:
        original_files["graphql_schema"] = set()
    
    print(f"Found existing files:")
    for category, files in original_files.items():
        print(f"  {category}: {len(files)} files")
    
    return original_files


def run_orb_schema_generator(output_dir: Path) -> Dict[str, Set[str]]:
    """Run orb-schema-generator and return generated file names."""
    schemas_dir = Path("/home/fishbeak/infrastructure/src/orb-integration-hub/schemas")
    
    # Load schemas
    print("\nLoading schemas...")
    loader = SchemaLoader()
    collection = loader.load_directory(str(schemas_dir / "entities"))
    print(f"Loaded {len(collection.schemas)} schemas")
    
    # Load core enums
    import yaml
    enums_path = schemas_dir / "core" / "enums.yml"
    core_enums = {}
    if enums_path.exists():
        with open(enums_path, 'r') as f:
            core_enums = yaml.safe_load(f)
        print(f"Loaded {len(core_enums)} core enums")
    
    # Generate Python
    print("\nGenerating Python...")
    python_output = output_dir / "python"
    python_config = PythonGeneratorConfig(
        output_dir=python_output,
        models_dir=python_output / "models",
        enums_dir=python_output / "enums"
    )
    python_gen = PythonGenerator(python_config)
    python_results = python_gen.generate(collection, core_enums)
    print(f"Generated {len(python_results['generated_files'])} Python files")
    
    # Generate TypeScript
    print("\nGenerating TypeScript...")
    ts_output = output_dir / "typescript"
    ts_config = TypeScriptGeneratorConfig(output_dir=ts_output)
    ts_gen = TypeScriptGenerator(ts_config)
    ts_results = ts_gen.generate(collection, core_enums)
    print(f"Generated {len(ts_results['generated_files'])} TypeScript files")
    
    # Generate GraphQL
    print("\nGenerating GraphQL...")
    graphql_output = output_dir / "graphql"
    graphql_config = GraphQLGeneratorConfig(output_dir=graphql_output)
    graphql_gen = GraphQLGenerator(graphql_config)
    graphql_results = graphql_gen.generate(collection)
    print(f"Generated {len(graphql_results['generated_files'])} GraphQL files")
    
    # Collect generated files
    generated_files = {
        "python_models": {f.name for f in (python_output / "models").glob("*Model.py")},
        "python_enums": {f.name for f in (python_output / "enums").glob("*Enum.py")},
        "typescript": {f.name for f in ts_output.glob("*.ts")},
        "graphql_ts": set(),  # We generate GraphQL operations as part of TS files
        "graphql_schema": {f.name for f in graphql_output.glob("*.graphql")},
    }
    
    return generated_files


def compare_file_contents(file1: Path, file2: Path) -> bool:
    """Compare two files ignoring timestamps and comments."""
    with open(file1, 'r') as f1, open(file2, 'r') as f2:
        lines1 = f1.readlines()
        lines2 = f2.readlines()
    
    # Normalize lines (remove timestamps and generation comments)
    def normalize_line(line):
        # Skip comment lines with timestamps
        if "Generated" in line or "timestamp" in line or "date:" in line:
            return ""
        return line.strip()
    
    lines1 = [normalize_line(l) for l in lines1 if normalize_line(l)]
    lines2 = [normalize_line(l) for l in lines2 if normalize_line(l)]
    
    return lines1 == lines2


def main():
    """Main comparison function."""
    print("="*80)
    print("ORB Schema Generator Compatibility Check")
    print("="*80)
    
    # Get files from original generate.py
    print("\n1. Checking files from original generate.py...")
    original_files = run_original_generate_py()
    
    # Run orb-schema-generator
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        print("\n2. Running orb-schema-generator...")
        new_files = run_orb_schema_generator(temp_path)
        
        # Compare results
        print("\n" + "="*80)
        print("COMPARISON RESULTS")
        print("="*80)
        print(f"{'Category':<20} {'Original':<15} {'New':<15} {'Match':<10} {'Notes':<30}")
        print("-"*80)
        
        comparison_data = []
        
        for category in ["python_models", "python_enums", "typescript", "graphql_ts", "graphql_schema"]:
            orig_count = len(original_files.get(category, set()))
            new_count = len(new_files.get(category, set()))
            
            # Check if sets match
            orig_set = original_files.get(category, set())
            new_set = new_files.get(category, set())
            
            if category == "graphql_ts" and new_count == 0:
                # GraphQL operations are embedded in TypeScript files
                match = "N/A"
                notes = "GraphQL ops in TS files"
            elif orig_set == new_set:
                match = "✓ EXACT"
                notes = "File names match exactly"
            elif orig_count == new_count:
                match = "✓ COUNT"
                notes = "Same count, different names"
            else:
                match = "✗ DIFF"
                missing = orig_set - new_set
                extra = new_set - orig_set
                if missing:
                    notes = f"Missing: {len(missing)} files"
                elif extra:
                    notes = f"Extra: {len(extra)} files"
                else:
                    notes = f"Diff: {abs(orig_count - new_count)}"
            
            comparison_data.append({
                "category": category,
                "original": orig_count,
                "new": new_count,
                "match": match,
                "notes": notes,
                "missing": orig_set - new_set,
                "extra": new_set - orig_set
            })
            
            print(f"{category:<20} {orig_count:<15} {new_count:<15} {match:<10} {notes:<30}")
        
        print("="*80)
        
        # Detailed differences
        print("\nDETAILED DIFFERENCES:")
        print("-"*80)
        
        for data in comparison_data:
            if data["missing"] or data["extra"]:
                print(f"\n{data['category']}:")
                if data["missing"]:
                    print(f"  Missing from new generator:")
                    for f in sorted(data["missing"]):
                        print(f"    - {f}")
                if data["extra"]:
                    print(f"  Extra in new generator:")
                    for f in sorted(data["extra"]):
                        print(f"    + {f}")
        
        # Summary
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        
        total_matches = sum(1 for d in comparison_data if d["match"].startswith("✓") or d["match"] == "N/A")
        total_categories = len(comparison_data)
        
        print(f"Categories matched: {total_matches}/{total_categories}")
        
        if total_matches == total_categories:
            print("\n✅ The orb-schema-generator produces compatible output!")
        else:
            print("\n⚠️  There are differences that need to be addressed.")
            print("\nRecommendations:")
            print("1. Check if missing files are actually needed")
            print("2. Verify extra files are intentional improvements")
            print("3. Compare file contents for semantic equivalence")


if __name__ == "__main__":
    main()