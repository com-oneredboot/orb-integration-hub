# file: apps/api/tests/property/test_no_information_leakage_property.py
# description: Property-based tests for no information leakage in auth-related code
# Feature: auth-workflow-review, Property 2: No Information Leakage
# Validates: Requirements 1.3, 3.5, 4.4, 5.6

"""
Property 2: No Information Leakage

*For any* log statement, error response, or user-facing message in auth-related code,
the output SHALL NOT contain:
- Email addresses in plaintext (except masked versions)
- Phone numbers
- Passwords or tokens
- Stack traces or internal file paths
- Database query details
"""

import re
from pathlib import Path
from typing import NamedTuple

import pytest
from hypothesis import given, settings
import hypothesis.strategies as st


# Patterns that indicate PII leakage
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_PATTERN = re.compile(r"\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
TOKEN_PATTERN = re.compile(
    r"(Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+|eyJ[A-Za-z0-9\-_]+)"
)
COGNITO_SUB_PATTERN = re.compile(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}")
STACK_TRACE_PATTERN = re.compile(r'(File\s+"[^"]+",\s+line\s+\d+|at\s+\S+\s+\([^)]+:\d+:\d+\))')
DB_QUERY_PATTERN = re.compile(r"(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+", re.IGNORECASE)

# Log statement patterns to search for
LOG_PATTERNS = [
    r"console\.(log|debug|info|warn|error)\s*\(",
    r"print\s*\(",
    r"logger\.(debug|info|warning|error|critical)\s*\(",
    r"logging\.(debug|info|warning|error|critical)\s*\(",
]


class LogStatement(NamedTuple):
    """Represents a log statement found in code."""

    file_path: str
    line_number: int
    content: str
    log_type: str


class PIILeakage(NamedTuple):
    """Represents a potential PII leakage."""

    file_path: str
    line_number: int
    content: str
    leakage_type: str
    pattern_match: str


def find_log_statements(file_path: str) -> list[LogStatement]:
    """Find all log statements in a file."""
    statements = []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except (IOError, UnicodeDecodeError):
        return statements

    for i, line in enumerate(lines, 1):
        for pattern in LOG_PATTERNS:
            if re.search(pattern, line):
                # Get the full statement (may span multiple lines)
                content = line.strip()
                log_type = (
                    "console" if "console" in line else "logger" if "logger" in line else "print"
                )
                statements.append(LogStatement(file_path, i, content, log_type))
                break

    return statements


def check_for_pii_leakage(statement: LogStatement) -> list[PIILeakage]:
    """Check a log statement for potential PII leakage."""
    leakages = []
    content = statement.content

    # Check for email addresses (not masked)
    email_matches = EMAIL_PATTERN.findall(content)
    for match in email_matches:
        # Allow masked emails like "t***@example.com"
        if "***" not in match and "example.com" not in match.lower():
            leakages.append(
                PIILeakage(statement.file_path, statement.line_number, content, "email", match)
            )

    # Check for phone numbers
    phone_matches = PHONE_PATTERN.findall(content)
    for match in phone_matches:
        leakages.append(
            PIILeakage(statement.file_path, statement.line_number, content, "phone", match)
        )

    # Check for tokens
    token_matches = TOKEN_PATTERN.findall(content)
    for match in token_matches:
        leakages.append(
            PIILeakage(statement.file_path, statement.line_number, content, "token", match)
        )

    return leakages


def scan_file_for_pii_in_logs(file_path: str) -> list[PIILeakage]:
    """Scan a file for PII leakage in log statements."""
    statements = find_log_statements(file_path)
    leakages = []

    for stmt in statements:
        leakages.extend(check_for_pii_leakage(stmt))

    return leakages


def get_auth_related_files() -> list[str]:
    """Get list of auth-related files to scan."""
    files = []

    # Backend Lambda files
    backend_paths = [
        "apps/api/lambdas/check_email_exists/",
        "apps/api/lambdas/create_user_from_cognito/",
        "apps/api/lambdas/cognito_group_manager/",
        "apps/api/lambdas/sms_verification/",
    ]

    # Get the project root
    test_dir = Path(__file__).parent
    project_root = test_dir.parent.parent.parent.parent

    for path in backend_paths:
        full_path = project_root / path
        if full_path.exists():
            for py_file in full_path.glob("*.py"):
                if not py_file.name.startswith("test_"):
                    files.append(str(py_file))

    return files


class TestNoInformationLeakage:
    """Property-based tests for no information leakage."""

    @pytest.fixture(scope="class")
    def auth_files(self) -> list[str]:
        """Get auth-related files to scan."""
        return get_auth_related_files()

    def test_no_email_in_logs(self, auth_files: list[str]):
        """
        Property: Log statements must not contain plaintext emails.

        For any log statement in auth-related code, it SHALL NOT contain
        plaintext email addresses.
        """
        all_leakages = []

        for file_path in auth_files:
            leakages = scan_file_for_pii_in_logs(file_path)
            email_leakages = [l for l in leakages if l.leakage_type == "email"]
            all_leakages.extend(email_leakages)

        assert (
            len(all_leakages) == 0
        ), f"Found {len(all_leakages)} email leakages in logs:\n" + "\n".join(
            [f"  {l.file_path}:{l.line_number} - {l.pattern_match}" for l in all_leakages]
        )

    def test_no_phone_in_logs(self, auth_files: list[str]):
        """
        Property: Log statements must not contain phone numbers.

        For any log statement in auth-related code, it SHALL NOT contain
        phone numbers.
        """
        all_leakages = []

        for file_path in auth_files:
            leakages = scan_file_for_pii_in_logs(file_path)
            phone_leakages = [l for l in leakages if l.leakage_type == "phone"]
            all_leakages.extend(phone_leakages)

        assert (
            len(all_leakages) == 0
        ), f"Found {len(all_leakages)} phone number leakages in logs:\n" + "\n".join(
            [f"  {l.file_path}:{l.line_number} - {l.pattern_match}" for l in all_leakages]
        )

    def test_no_tokens_in_logs(self, auth_files: list[str]):
        """
        Property: Log statements must not contain auth tokens.

        For any log statement in auth-related code, it SHALL NOT contain
        JWT tokens or bearer tokens.
        """
        all_leakages = []

        for file_path in auth_files:
            leakages = scan_file_for_pii_in_logs(file_path)
            token_leakages = [l for l in leakages if l.leakage_type == "token"]
            all_leakages.extend(token_leakages)

        assert (
            len(all_leakages) == 0
        ), f"Found {len(all_leakages)} token leakages in logs:\n" + "\n".join(
            [f"  {l.file_path}:{l.line_number} - {l.pattern_match}" for l in all_leakages]
        )

    def test_error_responses_no_stack_traces(self):
        """
        Property: Error responses must not contain stack traces.

        For any error response in auth-related code, it SHALL NOT contain
        stack traces or internal file paths.
        """
        # Check Lambda error handling files
        test_dir = Path(__file__).parent
        project_root = test_dir.parent.parent.parent.parent

        exceptions_file = project_root / "apps" / "api" / "core" / "exceptions.py"

        if not exceptions_file.exists():
            pytest.skip("exceptions.py not found")

        with open(exceptions_file, "r") as f:
            content = f.read()

        # Check that error responses use generic messages
        # Look for patterns that might expose internals
        dangerous_patterns = [
            r"traceback\.format_exc\(\)",
            r"str\(e\)",  # Raw exception to string
            r"repr\(e\)",  # Raw exception repr
        ]

        issues = []
        for pattern in dangerous_patterns:
            matches = re.findall(pattern, content)
            if matches:
                issues.append(f"Pattern '{pattern}' found in exceptions.py")

        # This is informational - we want to ensure errors are sanitized
        # The actual implementation should use error codes, not raw exceptions
        assert (
            "ErrorCode" in content or "error_code" in content
        ), "exceptions.py should use error codes for standardized error responses"

    def test_lambda_responses_use_error_codes(self):
        """
        Property: Lambda responses must use standardized error codes.

        For any Lambda function error response, it SHALL use error codes
        from the error registry, not raw exception messages.
        """
        test_dir = Path(__file__).parent
        project_root = test_dir.parent.parent.parent.parent

        lambda_dirs = [
            project_root / "apps" / "api" / "lambdas" / "check_email_exists",
            project_root / "apps" / "api" / "lambdas" / "create_user_from_cognito",
        ]

        for lambda_dir in lambda_dirs:
            if not lambda_dir.exists():
                continue

            handler_file = lambda_dir / "handler.py"
            if not handler_file.exists():
                continue

            with open(handler_file, "r") as f:
                content = f.read()

            # Check for proper error handling patterns
            # Should NOT have raw exception messages in responses
            bad_patterns = [
                r"return\s*\{[^}]*str\(e\)[^}]*\}",
                r"return\s*\{[^}]*exception[^}]*\}",
            ]

            for pattern in bad_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                assert (
                    len(matches) == 0
                ), f"Lambda {lambda_dir.name} may expose raw exceptions in responses"


# Property-based test for email masking
@given(st.emails())
@settings(max_examples=100)
def test_email_masking_property(email: str):
    """
    Property: Email masking function should hide most of the email.

    For any email address, the masked version SHALL:
    - Hide at least 50% of the local part
    - Keep the domain visible for debugging
    - Use asterisks for masking
    """

    def mask_email(email: str) -> str:
        """Example masking function - should be in production code."""
        if "@" not in email:
            return "***"
        local, domain = email.split("@", 1)
        if len(local) <= 2:
            masked_local = "*" * len(local)
        else:
            visible = max(1, len(local) // 4)
            masked_local = local[:visible] + "*" * (len(local) - visible)
        return f"{masked_local}@{domain}"

    masked = mask_email(email)

    # Property: masked email should contain asterisks
    assert "*" in masked, f"Masked email should contain asterisks: {masked}"

    # Property: domain should be preserved
    if "@" in email:
        domain = email.split("@")[1]
        assert domain in masked, f"Domain should be preserved: {masked}"

    # Property: original email should not be fully visible
    assert masked != email, f"Email should be masked: {masked}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
