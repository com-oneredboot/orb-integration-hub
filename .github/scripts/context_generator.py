import os
import json
from pathlib import Path
from typing import Dict, List, Optional
import re

class ContextGenerator:
    def __init__(self, repo_path: str, output_dir: str):
        self.repo_path = Path(repo_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Define what files to include/exclude
        self.include_patterns = [
            r".*\.component\.ts$",
            r".*\.component\.html$",
            r".*\.service\.ts$",
            r".*\.model\.ts$",
            r".*\.guard\.ts$",
            r"package\.json$",
            r"angular\.json$",
            r"tsconfig\.json$",
            r".*\.py$",
            r".*\.yml$",
            r".*\.yaml$",
            r"README\.md$",
            r"context/.*\.md$",
        ]

        self.exclude_patterns = [
            r".*\.spec\.ts$",
            r"node_modules/.*",
            r"\.git/.*",
            r"\.github/.*",
            r"dist/.*",
            r"coverage/.*",
            r"__pycache__/.*",
        ]

    def should_include_file(self, file_path: str) -> bool:
        """Determine if a file should be included in the context."""
        # First check exclusions
        for pattern in self.exclude_patterns:
            if re.match(pattern, file_path):
                return False

        # Then check inclusions
        for pattern in self.include_patterns:
            if re.match(pattern, file_path):
                return True

        return False

    def read_file_content(self, file_path: Path) -> Optional[Dict]:
        """Read file content and return formatted dictionary."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            return {
                "source": str(file_path.relative_to(self.repo_path)),
                "document_content": content
            }
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return None

    def generate_context(self) -> None:
        """Generate context files from repository."""
        documents = []

        # Walk through repository
        for root, _, files in os.walk(self.repo_path):
            root_path = Path(root)

            for file in files:
                file_path = root_path / file
                relative_path = str(file_path.relative_to(self.repo_path))

                if self.should_include_file(relative_path):
                    content = self.read_file_content(file_path)
                    if content:
                        documents.append(content)

        # Create context file
        context = {
            "documents": documents
        }

        # Write to output file
        output_file = self.output_dir / 'claude_context.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(context, f, indent=2)

        # Create a markdown summary
        self.generate_summary(documents)

    def generate_summary(self, documents: List[Dict]) -> None:
        """Generate a markdown summary of included files."""
        summary_content = "# Project Context Summary\n\n"
        summary_content += "## Included Files\n\n"

        # Group files by directory
        files_by_dir = {}
        for doc in documents:
            path = Path(doc['source'])
            dir_name = str(path.parent)
            if dir_name not in files_by_dir:
                files_by_dir[dir_name] = []
            files_by_dir[dir_name].append(path.name)

        # Create directory tree
        for dir_name, files in sorted(files_by_dir.items()):
            summary_content += f"\n### {dir_name if dir_name != '.' else 'Root'}\n"
            for file in sorted(files):
                summary_content += f"- {file}\n"

        # Write summary
        with open(self.output_dir / 'context_summary.md', 'w', encoding='utf-8') as f:
            f.write(summary_content)

def main():
    # These would be set by GitHub Actions
    repo_path = os.getenv('GITHUB_WORKSPACE', '.')
    output_dir = os.getenv('OUTPUT_DIR', './context_output')

    generator = ContextGenerator(repo_path, output_dir)
    generator.generate_context()

if __name__ == "__main__":
    main()