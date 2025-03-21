@echo off
setlocal enabledelayedexpansion

echo Validating CloudFormation templates...

REM Check if cfn-lint is installed
where cfn-lint >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo cfn-lint is not installed. Installing...
    pip install cfn-lint
)

REM Validate all templates
for %%t in (bootstrap.yml cognito.yml dynamodb.yml lambdas.yml appsync.yml) do (
    echo Validating %%t...
    cfn-lint %%t
    if !ERRORLEVEL! NEQ 0 (
        echo Validation failed for %%t
        exit /b 1
    )
)

echo All templates validated successfully! 