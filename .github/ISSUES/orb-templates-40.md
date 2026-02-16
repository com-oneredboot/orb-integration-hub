# orb-templates-mcp: uvx cannot authenticate with CodeArtifact

## Summary

The orb-templates-mcp MCP server cannot be installed via `uvx` as documented because `uvx` does not inherit pip's CodeArtifact authentication configuration.

## Environment

- Repository: orb-integration-hub
- Package: orb-templates-mcp v0.1.0
- Tool: uvx (via uv)

## Steps to Reproduce

1. Run `aws codeartifact login --tool pip --domain orb-infrastructure-shared-codeartifact-domain --repository orb-infrastructure-shared-pypi-repo`
2. Configure MCP as documented:
   ```json
   {
     "mcpServers": {
       "orb-templates": {
         "command": "uvx",
         "args": ["orb-templates-mcp"]
       }
     }
   }
   ```
3. Restart Kiro/Claude Desktop
4. MCP server fails to connect

## Expected Behavior

The MCP server should connect and provide tools.

## Actual Behavior

uvx fails with 401 Unauthorized because it doesn't use pip's CodeArtifact configuration:

```
× No solution found when resolving tool dependencies:
  ╰─▶ Because orb-templates-mcp was not found in the package registry and you require
      orb-templates-mcp, we can conclude that your requirements are unsatisfiable.

      hint: An index URL could not be queried due to a lack of valid authentication 
      credentials (401 Unauthorized).
```

## Root Cause

- `aws codeartifact login --tool pip` configures `~/.config/pip/pip.conf`
- `uvx` uses `uv` which has its own configuration and doesn't read pip.conf
- The MCP config cannot dynamically obtain CodeArtifact tokens

## Workarounds Attempted

1. **Using `--index-url` with static token placeholder**: Fails because the URL `https://aws:@...` requires a valid token
2. **Using `pipenv run uvx`**: Same authentication issue

## Suggested Solutions

### Option 1: Publish to PyPI (Recommended)

Publish orb-templates-mcp to public PyPI. The package contains only documentation references and doesn't expose proprietary code.

### Option 2: Document uv configuration

Add documentation for configuring uv to use CodeArtifact:

```bash
# Configure uv for CodeArtifact
export UV_INDEX_URL="https://aws:$(aws codeartifact get-authorization-token --domain orb-infrastructure-shared-codeartifact-domain --query authorizationToken --output text)@orb-infrastructure-shared-codeartifact-domain-432045270100.d.codeartifact.us-east-1.amazonaws.com/pypi/orb-infrastructure-shared-pypi-repo/simple/"
```

But this doesn't work for MCP configs which can't run shell commands.

### Option 3: Provide alternative installation method

Document installing the package to a known location and running directly:

```json
{
  "mcpServers": {
    "orb-templates": {
      "command": "python",
      "args": ["-m", "orb_templates_mcp.server"],
      "env": {
        "PYTHONPATH": "/path/to/installed/package"
      }
    }
  }
}
```

### Option 4: Create a wrapper script

Provide a shell script that handles authentication and runs the server:

```bash
#!/bin/bash
# orb-templates-mcp-wrapper.sh
export UV_INDEX_URL="https://aws:$(aws codeartifact get-authorization-token ...)@..."
exec uvx orb-templates-mcp "$@"
```

## Impact

- Issue #33 in orb-integration-hub cannot be completed
- Other orb projects cannot use the MCP server as documented
- Blocks adoption of orb-templates-mcp across the organization

## References

- orb-integration-hub Issue #33: Install and verify orb-templates-mcp server
- orb-templates-mcp README: packages/orb-templates-mcp/README.md
