# E2E Testing — Cowork (Claude Computer)

## Overview

This project includes an end-to-end testing system designed for execution by [Cowork](https://docs.anthropic.com/en/docs/agents-and-tools/computer-use) (Claude Computer) — an AI agent that controls a browser and CLI to run manual-style test workflows against the orb-integration-hub frontend and AWS dev backend.

## Architecture

The E2E setup uses two machines:

| Machine | Role | Key Responsibilities |
|---------|------|---------------------|
| **Linux** (dev machine) | Hosts the Angular frontend | Runs `ng serve` on `localhost:4200`, exposes it via ngrok at `https://tameka-overhonest-carefully.ngrok-free.dev` |
| **Windows** (Cowork) | Executes test workflows | Controls Chrome browser + CLI terminal, has full AWS SSO access (`sso-orb-dev` profile) |

The frontend connects to the deployed AWS dev backend (AppSync, Cognito, DynamoDB). Cowork uses the browser for UI interactions and the CLI for AWS operations (SSM, Secrets Manager, CloudWatch Logs, Cognito, DynamoDB).

## Quick Start

### 1. Prepare the Linux machine

```bash
# Start the frontend + ngrok tunnel
./scripts/e2e-cowork-setup.sh

# When done, tear down
./scripts/e2e-cowork-setup.sh --stop
```

The setup script performs these steps sequentially (fail-fast):
1. Verifies AWS SSO session is active
2. Installs frontend dependencies (`npm install`)
3. Starts the Angular dev server in the background
4. Polls `localhost:4200` until ready (60s timeout)
5. Starts the ngrok tunnel (runs in foreground)

The `--stop` flag kills the Angular dev server (port 4200) and ngrok processes. It is idempotent — safe to run even if no processes are running.

### 2. Run the test workflows

Point Cowork at the instruction document:

> **[docs/e2e-cowork-instructions.md](./e2e-cowork-instructions.md)**

This document contains 16 sequential test workflows that Cowork reads and executes top-to-bottom. It includes the glossary, Notepad schema, dependency chain, detailed step-by-step instructions for each workflow, retry logic, failure handling, and the test summary report template.

## Test Credentials

Test credentials are stored in AWS and retrieved by Cowork via CLI during test execution.

| Credential | Storage | Path / ID |
|------------|---------|-----------|
| Test email | SSM Parameter (String) | `/orb/integration-hub/dev/e2e/test-user-email` |
| Test password | Secrets Manager | `orb/integration-hub/dev/secrets/e2e/test-user-password` |
| Password secret name pointer | SSM Parameter (String) | `/orb/integration-hub/dev/e2e/test-user-password/secret-name` |

All AWS operations use the `sso-orb-dev` profile. The SSM parameters and Secrets Manager secret are provisioned by the `BootstrapStack` in `infrastructure/cdk/stacks/bootstrap_stack.py`.

## Key References

| Resource | Path | Description |
|----------|------|-------------|
| Setup script | `scripts/e2e-cowork-setup.sh` | Prepares the Linux machine (start/stop modes) |
| Instruction document | `docs/e2e-cowork-instructions.md` | 16 sequential workflows for Cowork to execute |
| Bootstrap stack | `infrastructure/cdk/stacks/bootstrap_stack.py` | CDK stack that provisions E2E test credentials |
| ngrok domain | `tameka-overhonest-carefully.ngrok-free.dev` | Reserved ngrok domain for the tunnel |
