# Add Windows Support for MCP Installation Script

## Summary

The `install-mcp.sh` script and MCP setup documentation only support Linux/macOS. Windows users cannot use the script and must manually configure the MCP server with Windows-specific paths.

## Problem

1. **Installation script is bash-only**: `scripts/install-mcp.sh` uses bash syntax and Linux paths, making it unusable on Windows PowerShell
2. **Documentation assumes Linux paths**: The MCP configuration examples use `/home/user/.orb-mcp-venv/bin/python` which doesn't work on Windows
3. **No Windows path guidance**: Windows users need to use `C:\Users\<username>\.orb-mcp-venv\Scripts\python.exe` but this isn't documented

## Current Workaround

Windows users must manually:
1. Create a virtualenv: `python -m venv $env:USERPROFILE\.orb-mcp-venv`
2. Activate and install: `& "$env:USERPROFILE\.orb-mcp-venv\Scripts\pip.exe" install orb-templates-mcp`
3. Configure MCP with Windows path:
```json
{
  "mcpServers": {
    "orb-templates": {
      "command": "C:\\Users\\<username>\\.orb-mcp-venv\\Scripts\\python.exe",
      "args": ["-m", "orb_templates_mcp.server"],
      "disabled": false,
      "autoApprove": ["search_standards", "validate_naming", "get_workflow_template"]
    }
  }
}
```

## Requested Changes

1. **Add PowerShell installation script**: Create `scripts/install-mcp.ps1` for Windows users
2. **Update documentation**: Add Windows-specific instructions to `packages/orb-templates-mcp/README.md` and `docs/integration-guides/mcp-setup.md`
3. **Add platform detection**: Consider adding platform-specific configuration examples in the installation output

## Environment

- OS: Windows 11
- Shell: PowerShell
- Kiro version: Latest

## Impact

Windows developers cannot easily set up the orb-templates MCP server, reducing adoption and requiring manual troubleshooting.
