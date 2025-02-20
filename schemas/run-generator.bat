@echo off
:: run-generator.bat
:: Script to run the schema generator within the pipenv environment on Windows

echo Starting schema generator...

:: Store current directory
set CURRENT_DIR=%CD%
set SCRIPT_DIR=%~dp0
cd %SCRIPT_DIR%

:: Check if pipenv is installed
where pipenv >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: pipenv is not installed. Please install it first.
    echo You can install it using: pip install pipenv
    pause
    exit /b 1
)

:: Install dependencies if needed
echo Checking and installing dependencies if needed...
pipenv install pyyaml jinja2
if %ERRORLEVEL% geq 2 (
    echo Critical error installing dependencies
    pause
    exit /b 1
)

:: Run the generator script - use the full path to index.yml
echo Running schema generator...
pipenv run python %SCRIPT_DIR%generate.py
set RESULT=%ERRORLEVEL%

:: Return to original directory
cd %CURRENT_DIR%

:: Check the exit status
if %RESULT% equ 0 (
    echo Schema generation completed successfully!
) else (
    echo Schema generation failed. Check the logs for details.
    echo Exit code: %RESULT%
)

echo Done!
pause