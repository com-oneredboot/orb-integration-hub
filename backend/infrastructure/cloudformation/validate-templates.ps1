# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "Starting CloudFormation template validation..."
Write-Host "Current directory: $(Get-Location)"

# Check if cfn-lint is installed
try {
    Write-Host "Checking if cfn-lint is installed..."
    $null = Get-Command cfn-lint -ErrorAction Stop
    Write-Host "cfn-lint is installed"
} catch {
    Write-Host "cfn-lint is not installed. Installing..."
    try {
        pip install cfn-lint
        Write-Host "cfn-lint installed successfully"
    } catch {
        Write-Host "Failed to install cfn-lint: $_"
        exit 1
    }
}

# Validate all templates
$templates = @(
    "bootstrap.yml",
    "cognito.yml",
    "dynamodb.yml",
    "lambdas.yml",
    "appsync.yml"
)

foreach ($template in $templates) {
    Write-Host "`nValidating $template..."
    if (-not (Test-Path $template)) {
        Write-Host "ERROR: Template file $template not found"
        exit 1
    }
    
    try {
        cfn-lint $template
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Validation failed for $template"
            exit 1
        }
        Write-Host "Successfully validated $template"
    } catch {
        Write-Host "ERROR: Exception while validating $template : $_"
        exit 1
    }
}

Write-Host "`nAll templates validated successfully!" 