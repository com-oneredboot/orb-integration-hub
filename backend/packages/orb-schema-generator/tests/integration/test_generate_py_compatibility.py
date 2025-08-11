"""Integration test to compare output with original generate.py."""

import os
import subprocess
import tempfile
import filecmp
import difflib
from pathlib import Path
from typing import Dict, List, Tuple

import pytest

from orb_schema_generator import SchemaLoader
from orb_schema_generator.generators.python_generator import PythonGenerator, PythonGeneratorConfig
from orb_schema_generator.generators.typescript_generator import TypeScriptGenerator, TypeScriptGeneratorConfig
from orb_schema_generator.generators.graphql_generator import GraphQLGenerator, GraphQLGeneratorConfig


# Path to the original schemas directory
SCHEMAS_DIR = Path("/home/fishbeak/infrastructure/src/orb-integration-hub/schemas")
GENERATE_PY = SCHEMAS_DIR / "generate.py"


def run_original_generate_py(output_dir: Path) -> Dict[str, List[Path]]:
    """Run the original generate.py and collect generated files."""
    # Save current directory
    original_cwd = os.getcwd()
    
    try:
        # Change to schemas directory
        os.chdir(SCHEMAS_DIR)
        
        # Run generate.py
        result = subprocess.run(
            ["python", "generate.py"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"generate.py failed: {result.stderr}")
        
        # Collect generated files
        generated_files = {
            "python_models": list(Path("../backend/packages/orb-models/orb_models/models").glob("*.py")),
            "python_enums": list(Path("../backend/packages/orb-models/orb_models/enums").glob("*.py")),
            "typescript": list(Path("../frontend/src/app/core/models").glob("*.ts")),
            "graphql": list(Path("../frontend/src/app/core/graphql").glob("*.graphql.ts")),
            "schema": list(Path("../infrastructure/cloudformation").glob("appsync_*.graphql")),
        }
        
        return generated_files
        
    finally:
        os.chdir(original_cwd)


def run_orb_schema_generator(schemas_dir: Path, output_dir: Path) -> Dict[str, List[Path]]:
    """Run the new orb-schema-generator and collect generated files."""
    # Load schemas
    loader = SchemaLoader()
    collection = loader.load_directory(str(schemas_dir / "entities"))
    
    # Generate Python
    python_output = output_dir / "python"
    python_config = PythonGeneratorConfig(
        output_dir=python_output,
        models_dir=python_output / "models",
        enums_dir=python_output / "enums"
    )
    python_gen = PythonGenerator(python_config)
    python_gen.generate(collection)
    
    # Generate TypeScript
    ts_output = output_dir / "typescript"
    ts_config = TypeScriptGeneratorConfig(output_dir=ts_output)
    ts_gen = TypeScriptGenerator(ts_config)
    ts_gen.generate(collection)
    
    # Generate GraphQL
    graphql_output = output_dir / "graphql"
    graphql_config = GraphQLGeneratorConfig(output_dir=graphql_output)
    graphql_gen = GraphQLGenerator(graphql_config)
    graphql_gen.generate(collection)
    
    # Collect generated files
    generated_files = {
        "python_models": list((python_output / "models").glob("*.py")),
        "python_enums": list((python_output / "enums").glob("*.py")),
        "typescript": list(ts_output.glob("*.ts")),
        "graphql": [],  # GraphQL operations are embedded in TS files
        "schema": list(graphql_output.glob("*.graphql")),
    }
    
    return generated_files


def compare_files(file1: Path, file2: Path) -> Tuple[bool, List[str]]:
    """Compare two files and return differences."""
    with open(file1, 'r') as f1, open(file2, 'r') as f2:
        lines1 = f1.readlines()
        lines2 = f2.readlines()
    
    # Normalize timestamps and comments
    lines1 = [line for line in lines1 if not line.strip().startswith('#') and 'timestamp' not in line.lower()]
    lines2 = [line for line in lines2 if not line.strip().startswith('#') and 'timestamp' not in line.lower()]
    
    diff = list(difflib.unified_diff(lines1, lines2, fromfile=str(file1), tofile=str(file2)))
    
    return len(diff) == 0, diff


def test_compatibility_with_generate_py():
    """Test that orb-schema-generator produces equivalent output to generate.py."""
    if not GENERATE_PY.exists():
        pytest.skip("Original generate.py not found")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Run both generators
        print("\nRunning original generate.py...")
        original_files = run_original_generate_py(SCHEMAS_DIR)
        
        print("Running orb-schema-generator...")
        new_files = run_orb_schema_generator(SCHEMAS_DIR, temp_path)
        
        # Compare results
        comparison_results = []
        
        for category in ["python_models", "python_enums", "typescript", "schema"]:
            original_count = len(original_files.get(category, []))
            new_count = len(new_files.get(category, []))
            
            comparison_results.append({
                "Category": category.replace("_", " ").title(),
                "Original Count": original_count,
                "New Count": new_count,
                "Status": "✓" if original_count == new_count else "✗",
                "Difference": new_count - original_count
            })
        
        # Print comparison table
        print("\n" + "="*80)
        print("GENERATION COMPARISON RESULTS")
        print("="*80)
        print(f"{'Category':<20} {'Original':<12} {'New':<12} {'Status':<10} {'Diff':<10}")
        print("-"*80)
        
        for result in comparison_results:
            print(f"{result['Category']:<20} {result['Original Count']:<12} {result['New Count']:<12} {result['Status']:<10} {result['Difference']:+<10}")
        
        print("="*80)
        
        # Detailed file comparison for a sample
        print("\nSample File Comparisons:")
        print("-"*80)
        
        # Compare a sample Python model
        if original_files["python_models"] and new_files["python_models"]:
            sample_model = "UsersModel.py"
            original_model = next((f for f in original_files["python_models"] if f.name == sample_model), None)
            new_model = next((f for f in new_files["python_models"] if f.name == sample_model), None)
            
            if original_model and new_model:
                same, diff = compare_files(original_model, new_model)
                print(f"\nPython Model ({sample_model}): {'IDENTICAL' if same else 'DIFFERENT'}")
                if not same and len(diff) < 20:
                    print("".join(diff[:20]))
        
        # Store results for assertion
        all_match = all(r["Status"] == "✓" for r in comparison_results)
        
        # Generate detailed report
        report_path = temp_path / "compatibility_report.txt"
        with open(report_path, 'w') as f:
            f.write("ORB Schema Generator Compatibility Report\n")
            f.write("="*80 + "\n\n")
            
            for result in comparison_results:
                f.write(f"{result['Category']}:\n")
                f.write(f"  Original: {result['Original Count']} files\n")
                f.write(f"  New: {result['New Count']} files\n")
                f.write(f"  Status: {result['Status']}\n\n")
            
            if not all_match:
                f.write("\nDifferences Found!\n")
                f.write("Please review the generated files to ensure compatibility.\n")
        
        print(f"\nDetailed report saved to: {report_path}")
        
        # Assert all categories match
        assert all_match, "Generated file counts do not match original generate.py"


if __name__ == "__main__":
    test_compatibility_with_generate_py()