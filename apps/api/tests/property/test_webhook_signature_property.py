"""
Webhook Signature Property Tests

Validates:
- Webhook signature is deterministic for same payload+secret
- Different payloads produce different signatures
- Different secrets produce different signatures

@see .kiro/specs/application-environment-config/design.md
**Validates: Requirements 3.2, 22.3**
"""

import hashlib
import hmac
import json
from typing import Any

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st


def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload.

    Args:
        payload: JSON string payload to sign
        secret: Webhook secret key

    Returns:
        Hex-encoded HMAC-SHA256 signature
    """
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_signature(payload: str, secret: str, signature: str) -> bool:
    """Verify a webhook signature.

    Args:
        payload: JSON string payload
        secret: Webhook secret key
        signature: Signature to verify

    Returns:
        True if signature is valid
    """
    expected = generate_signature(payload, secret)
    return hmac.compare_digest(expected, signature)


# Strategies for generating test data
webhook_secrets = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    min_size=16,
    max_size=64,
)

simple_values = st.one_of(
    st.text(min_size=0, max_size=100),
    st.integers(),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.none(),
)

# Recursive strategy for JSON-like structures
json_values = st.recursive(
    simple_values,
    lambda children: st.one_of(
        st.lists(children, max_size=5),
        st.dictionaries(
            st.text(min_size=1, max_size=20),
            children,
            max_size=5,
        ),
    ),
    max_leaves=10,
)


class TestWebhookSignatureProperty:
    """Property tests for webhook signature generation."""

    @settings(max_examples=100)
    @given(
        payload=st.dictionaries(
            st.text(min_size=1, max_size=20),
            simple_values,
            min_size=1,
            max_size=10,
        ),
        secret=webhook_secrets,
    )
    def test_signature_is_deterministic(
        self, payload: dict[str, Any], secret: str
    ) -> None:
        """Property: Same payload and secret always produce same signature.

        **Validates: Requirements 22.3**
        """
        payload_json = json.dumps(payload, sort_keys=True, default=str)

        sig1 = generate_signature(payload_json, secret)
        sig2 = generate_signature(payload_json, secret)

        assert sig1 == sig2, "Signature should be deterministic"

    @settings(max_examples=100)
    @given(
        payload=st.dictionaries(
            st.text(min_size=1, max_size=20),
            simple_values,
            min_size=1,
            max_size=10,
        ),
        secret=webhook_secrets,
    )
    def test_signature_verification_works(
        self, payload: dict[str, Any], secret: str
    ) -> None:
        """Property: Generated signatures can be verified.

        **Validates: Requirements 3.2**
        """
        payload_json = json.dumps(payload, sort_keys=True, default=str)
        signature = generate_signature(payload_json, secret)

        assert verify_signature(
            payload_json, secret, signature
        ), "Signature verification should succeed"

    @settings(max_examples=100)
    @given(
        payload1=st.dictionaries(
            st.text(min_size=1, max_size=20),
            simple_values,
            min_size=1,
            max_size=5,
        ),
        payload2=st.dictionaries(
            st.text(min_size=1, max_size=20),
            simple_values,
            min_size=1,
            max_size=5,
        ),
        secret=webhook_secrets,
    )
    def test_different_payloads_different_signatures(
        self, payload1: dict[str, Any], payload2: dict[str, Any], secret: str
    ) -> None:
        """Property: Different payloads produce different signatures."""
        payload1_json = json.dumps(payload1, sort_keys=True, default=str)
        payload2_json = json.dumps(payload2, sort_keys=True, default=str)

        assume(payload1_json != payload2_json)

        sig1 = generate_signature(payload1_json, secret)
        sig2 = generate_signature(payload2_json, secret)

        assert sig1 != sig2, "Different payloads should have different signatures"

    @settings(max_examples=100)
    @given(
        payload=st.dictionaries(
            st.text(min_size=1, max_size=20),
            simple_values,
            min_size=1,
            max_size=5,
        ),
        secret1=webhook_secrets,
        secret2=webhook_secrets,
    )
    def test_different_secrets_different_signatures(
        self, payload: dict[str, Any], secret1: str, secret2: str
    ) -> None:
        """Property: Different secrets produce different signatures."""
        assume(secret1 != secret2)

        payload_json = json.dumps(payload, sort_keys=True, default=str)

        sig1 = generate_signature(payload_json, secret1)
        sig2 = generate_signature(payload_json, secret2)

        assert sig1 != sig2, "Different secrets should produce different signatures"

    @settings(max_examples=100)
    @given(
        payload=st.dictionaries(
            st.text(min_size=1, max_size=20),
            simple_values,
            min_size=1,
            max_size=5,
        ),
        secret=webhook_secrets,
        wrong_secret=webhook_secrets,
    )
    def test_wrong_secret_fails_verification(
        self, payload: dict[str, Any], secret: str, wrong_secret: str
    ) -> None:
        """Property: Wrong secret fails signature verification."""
        assume(secret != wrong_secret)

        payload_json = json.dumps(payload, sort_keys=True, default=str)
        signature = generate_signature(payload_json, secret)

        assert not verify_signature(
            payload_json, wrong_secret, signature
        ), "Wrong secret should fail verification"


class TestWebhookSignatureFormat:
    """Tests for webhook signature format."""

    @settings(max_examples=50)
    @given(
        payload=st.text(min_size=1, max_size=1000),
        secret=webhook_secrets,
    )
    def test_signature_is_hex_string(self, payload: str, secret: str) -> None:
        """Property: Signature is a valid hex string."""
        signature = generate_signature(payload, secret)

        # Should be 64 characters (256 bits = 32 bytes = 64 hex chars)
        assert len(signature) == 64, "SHA256 signature should be 64 hex chars"

        # Should only contain hex characters
        assert all(
            c in "0123456789abcdef" for c in signature
        ), "Signature should be lowercase hex"

    @settings(max_examples=50)
    @given(secret=webhook_secrets)
    def test_empty_payload_produces_valid_signature(self, secret: str) -> None:
        """Property: Empty payload still produces valid signature."""
        signature = generate_signature("", secret)

        assert len(signature) == 64
        assert all(c in "0123456789abcdef" for c in signature)


class TestWebhookSignatureEdgeCases:
    """Edge case tests for webhook signatures."""

    def test_unicode_payload(self) -> None:
        """Unicode characters in payload are handled correctly."""
        payload = json.dumps({"message": "Hello 世界 🌍"})
        secret = "test-secret-12345678"

        sig1 = generate_signature(payload, secret)
        sig2 = generate_signature(payload, secret)

        assert sig1 == sig2
        assert len(sig1) == 64

    def test_unicode_secret(self) -> None:
        """Unicode characters in secret are handled correctly."""
        payload = json.dumps({"test": "data"})
        secret = "secret-with-émojis-🔐"

        sig1 = generate_signature(payload, secret)
        sig2 = generate_signature(payload, secret)

        assert sig1 == sig2
        assert len(sig1) == 64

    def test_large_payload(self) -> None:
        """Large payloads are handled correctly."""
        payload = json.dumps({"data": "x" * 100000})
        secret = "test-secret-12345678"

        signature = generate_signature(payload, secret)

        assert len(signature) == 64
        assert verify_signature(payload, secret, signature)

    def test_timing_safe_comparison(self) -> None:
        """Signature verification uses timing-safe comparison."""
        payload = json.dumps({"test": "data"})
        secret = "test-secret-12345678"
        signature = generate_signature(payload, secret)

        # This should use hmac.compare_digest internally
        # which is timing-safe
        assert verify_signature(payload, secret, signature)

        # Wrong signature should fail
        wrong_sig = "0" * 64
        assert not verify_signature(payload, secret, wrong_sig)
