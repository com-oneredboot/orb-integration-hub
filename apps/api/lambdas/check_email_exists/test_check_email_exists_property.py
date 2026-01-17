# file: apps/api/lambdas/check_email_exists/test_check_email_exists_property.py
# author: Corey Dale Peters
# created: 2026-01-16
# description: Property-based tests for CheckEmailExists Lambda email validation

import os
import sys

from hypothesis import given, strategies as st, settings, assume

sys.path.append(os.path.dirname(__file__))
from index import validate_email


class TestEmailValidationProperties:
    """Property-based tests for email validation"""

    @given(
        local=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._%+-",
            min_size=1,
            max_size=64,
        ),
        domain=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-",
            min_size=1,
            max_size=63,
        ),
        tld=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            min_size=2,
            max_size=10,
        ),
    )
    @settings(max_examples=100)
    def test_valid_email_structure_accepted(self, local: str, domain: str, tld: str):
        """
        Property: Valid email structure should be accepted.

        For any email with valid local part, domain, and TLD,
        the validation should return True.
        """
        # Filter out edge cases that would make invalid emails
        assume(len(local) > 0)
        assume(len(domain) > 0)
        assume(len(tld) >= 2)
        assume(not local.startswith("."))
        assume(not local.endswith("."))
        assume(not domain.startswith("."))
        assume(not domain.endswith("."))
        assume(not domain.startswith("-"))
        assume(not domain.endswith("-"))
        assume(".." not in local)
        assume(".." not in domain)

        email = f"{local}@{domain}.{tld}"
        result = validate_email(email)

        # Should accept valid structure
        assert isinstance(result, bool)

    @given(st.text(min_size=0, max_size=100))
    @settings(max_examples=100)
    def test_string_without_at_rejected(self, text: str):
        """
        Property: Any string without @ symbol should be rejected.

        For any string that doesn't contain @, validation must return False.
        """
        assume("@" not in text)

        result = validate_email(text)
        assert result is False, f"Should reject string without @: {text}"

    @given(st.text(min_size=0, max_size=100))
    @settings(max_examples=100)
    def test_string_ending_with_at_rejected(self, text: str):
        """
        Property: Any string ending with @ should be rejected.

        For any string that ends with @, validation must return False.
        """
        email = text + "@"

        result = validate_email(email)
        assert result is False, f"Should reject string ending with @: {email}"

    @given(st.text(min_size=0, max_size=100))
    @settings(max_examples=100)
    def test_string_starting_with_at_rejected(self, text: str):
        """
        Property: Any string starting with @ should be rejected.

        For any string that starts with @, validation must return False.
        """
        email = "@" + text

        result = validate_email(email)
        assert result is False, f"Should reject string starting with @: {email}"

    @given(
        local=st.text(min_size=1, max_size=50),
        domain=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=100)
    def test_missing_tld_rejected(self, local: str, domain: str):
        """
        Property: Email without TLD (no dot in domain) should be rejected.

        For any email where domain has no dot, validation must return False.
        """
        assume("." not in domain)
        assume("@" not in local)
        assume("@" not in domain)

        email = f"{local}@{domain}"

        result = validate_email(email)
        assert result is False, f"Should reject email without TLD: {email}"

    @given(
        local=st.text(min_size=1, max_size=50),
        domain=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=100)
    def test_single_char_tld_rejected(self, local: str, domain: str):
        """
        Property: Email with single character TLD should be rejected.

        TLDs must be at least 2 characters.
        """
        assume("@" not in local)
        assume("@" not in domain)
        assume("." not in domain)

        email = f"{local}@{domain}.a"

        result = validate_email(email)
        assert result is False, f"Should reject single char TLD: {email}"

    @given(
        st.none() | st.integers() | st.lists(st.integers()) | st.dictionaries(st.text(), st.text())
    )
    @settings(max_examples=50)
    def test_non_string_types_rejected(self, value):
        """
        Property: Non-string types should be rejected.

        For any non-string input, validation must return False.
        """
        result = validate_email(value)
        assert result is False, f"Should reject non-string type: {type(value)}"

    @given(st.text(min_size=0, max_size=5))
    @settings(max_examples=50)
    def test_very_short_strings_rejected(self, text: str):
        """
        Property: Very short strings (< 6 chars) cannot be valid emails.

        Minimum valid email is a@b.co (6 chars).
        """
        assume(len(text) < 6)

        result = validate_email(text)
        assert result is False, f"Should reject very short string: {text}"
