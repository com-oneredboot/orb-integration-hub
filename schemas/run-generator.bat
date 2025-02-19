@echo off
:: run-generator.bat
:: Script to run the schema generator within the pipenv environment on Windows

echo Starting schema generator...

:: Check if pipenv is installed
where pipenv >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: pipenv is not installed. Please install it first.
    echo You can install it using: pip install pipenv
    pause
    exit /b 1
)

:: Install dependencies if needed
echo Checking dependencies...
findstr /C:"pyyaml" Pipfile >nul 2>&1
set YAML_MISSING=%ERRORLEVEL%
findstr /C:"jinja2" Pipfile >nul 2>&1
set JINJA_MISSING=%ERRORLEVEL%

if %YAML_MISSING% neq 0 (
    echo PyYAML not found in Pipfile
    set INSTALL_DEPS=1
)
if %JINJA_MISSING% neq 0 (
    echo Jinja2 not found in Pipfile
    set INSTALL_DEPS=1
)

if defined INSTALL_DEPS (
    echo Installing required dependencies...
    pipenv install pyyaml jinja2
    if %ERRORLEVEL% neq 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed.
)

:: Run the generator script
echo Running schema generator...
pipenv run python schemas/generate.py
set RESULT=%ERRORLEVEL%

:: Check the exit status
if %RESULT% equ 0 (
    echo Schema generation completed successfully!
) else (
    echo Schema generation failed. Check the logs for details.
    echo Exit code: %RESULT%
)

echo Done!
pause