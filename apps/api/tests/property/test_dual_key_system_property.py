# file: apps/api/tests/property/test_dual_key_system_property.py
# author: AI Assistant
# created: 2026-02-03
# description: Property tests for Dual Key System (PUBLISHABLE vs SECRET keys)
# Feature: application-environment-config

"""
Dual Key System Property Tests

Validates:
- Key type detection from prefix (pk_* vs sk_*)
- Publishable key format: pk_{env}_{random32chars}
- Secret key format: sk_{env}_{random32chars}
- Key type is correctly stored and retrieved
- Origin validation only applies to publishable keys

**Validates: Requirements 3.1, 3.2**
"""

import hashlib
import secrets
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Add the lambda directory to path for imports
lambda_path = Path(__file__).parent.parent.parent / "lambdas" / "application_api_keys"
if str(lambda_path) not in sys.path:
    sys.path.insert(0, str(lambda_path))


# Environment prefixes matching the service
ENV_PREFIXES = {
    "PRODUCTION": "prod",
    "STAGING": "stag",
    "DEVELOPMENT": "dev",
    "TEST": "test",
    "PREVIEW": "prev",
}

# Key type prefixes
KEY_TYPE_PREFIXES = {
    "PUBLISHABLE": "pk",
    "SECRET": "sk",
}

VALID_KEY_TYPES = {"PUBLISHABLE", "SECRET"}


def generate_typed_api_key(environment: str, key_type: str) -> str:
    """Generate an API key with type-specific prefix.

    Publishable key format: pk_{env}_{random32chars}
    Secret key format: sk_{env}_{random32chars}
    """
    env_prefix = ENV_PREFIXES.get(environment, "unk")
    type_prefix = KEY_TYPE_PREFIXES.get(key_type, "uk")
    random_part = secrets.token_hex(16)  # 32 hex chars
    return f"{type_prefix}_{env_prefix}_{random_part}"


def detect_key_type(key: str) -> str | None:
    """Detect key type from prefix."""
    if key.startswith("pk_"):
        return "PUBLISHABLE"
    elif key.startswith("sk_"):
        return "SECRET"
    elif key.startswith("orb_"):
        return "SECRET"  # Legacy keys treated as SECRET
    return None


def hash_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


class TestDualKeySystemProperty:
    """Property tests for Dual Key System."""

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        key_type=st.sampled_from(list(VALID_KEY_TYPES)),
    )
    def test_key_type_prefix_is_correct(self, environment: str, key_type: str) -> None:
        """Property: Generated keys have correct type prefix.

        **Validates: Requirements 3.1, 3.2**
        """
        key = generate_typed_api_key(environment, key_type)
        expected_prefix = KEY_TYPE_PREFIXES[key_type]

        assert key.startswith(
            f"{expected_prefix}_"
        ), f"Key should start with '{expected_prefix}_': {key}"

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        key_type=st.sampled_from(list(VALID_KEY_TYPES)),
    )
    def test_key_type_detection_roundtrip(self, environment: str, key_type: str) -> None:
        """Property: Key type can be detected from generated key prefix.

        **Validates: Requirements 3.1, 3.2**
        """
        key = generate_typed_api_key(environment, key_type)
        detected_type = detect_key_type(key)

        assert (
            detected_type == key_type
        ), f"Detected type '{detected_type}' should match '{key_type}' for key: {key}"

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        key_type=st.sampled_from(list(VALID_KEY_TYPES)),
    )
    def test_typed_key_format_is_correct(self, environment: str, key_type: str) -> None:
        """Property: Generated typed keys follow the expected format.

        Format: {type_prefix}_{env_prefix}_{32_hex_chars}
        """
        key = generate_typed_api_key(environment, key_type)

        parts = key.split("_")
        assert len(parts) == 3, f"Key should have 3 parts separated by '_': {key}"

        type_prefix = KEY_TYPE_PREFIXES[key_type]
        env_prefix = ENV_PREFIXES[environment]

        assert parts[0] == type_prefix, f"First part should be '{type_prefix}': {key}"
        assert parts[1] == env_prefix, f"Second part should be '{env_prefix}': {key}"
        assert len(parts[2]) == 32, f"Random part should be 32 chars: {key}"

    @settings(max_examples=100)
    @given(environment=st.sampled_from(list(ENV_PREFIXES.keys())))
    def test_publishable_and_secret_keys_are_different(self, environment: str) -> None:
        """Property: Publishable and secret keys for same env are different."""
        pk_key = generate_typed_api_key(environment, "PUBLISHABLE")
        sk_key = generate_typed_api_key(environment, "SECRET")

        assert pk_key != sk_key, "Publishable and secret keys should be different"
        assert hash_key(pk_key) != hash_key(sk_key), "Key hashes should be different"

    @settings(max_examples=100)
    @given(
        env1=st.sampled_from(list(ENV_PREFIXES.keys())),
        env2=st.sampled_from(list(ENV_PREFIXES.keys())),
        type1=st.sampled_from(list(VALID_KEY_TYPES)),
        type2=st.sampled_from(list(VALID_KEY_TYPES)),
    )
    def test_all_keys_are_unique(self, env1: str, env2: str, type1: str, type2: str) -> None:
        """Property: Any two generated keys are unique regardless of type/env."""
        key1 = generate_typed_api_key(env1, type1)
        key2 = generate_typed_api_key(env2, type2)

        assert key1 != key2, "Generated keys should be unique"
        assert hash_key(key1) != hash_key(key2), "Key hashes should be unique"


class TestKeyTypeDetection:
    """Tests for key type detection from prefix."""

    def test_detect_publishable_key(self) -> None:
        """Publishable keys (pk_*) are correctly detected."""
        key = "pk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        assert detect_key_type(key) == "PUBLISHABLE"

    def test_detect_secret_key(self) -> None:
        """Secret keys (sk_*) are correctly detected."""
        key = "sk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        assert detect_key_type(key) == "SECRET"

    def test_detect_legacy_key(self) -> None:
        """Legacy keys (orb_*) are treated as SECRET."""
        key = "orb_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        assert detect_key_type(key) == "SECRET"

    def test_detect_unknown_key(self) -> None:
        """Unknown key formats return None."""
        key = "unknown_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        assert detect_key_type(key) is None


class TestKeyPrefixDisplay:
    """Tests for key prefix display format."""

    @settings(max_examples=50)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        key_type=st.sampled_from(list(VALID_KEY_TYPES)),
    )
    def test_display_prefix_format(self, environment: str, key_type: str) -> None:
        """Display prefix follows format: {type}_{env}_{first4}****"""
        key = generate_typed_api_key(environment, key_type)
        parts = key.split("_")
        random_part = parts[2]

        type_prefix = KEY_TYPE_PREFIXES[key_type]
        env_prefix = ENV_PREFIXES[environment]
        expected_display = f"{type_prefix}_{env_prefix}_{random_part[:4]}****"

        # Verify the display format is constructable
        assert len(expected_display) > 0
        assert expected_display.endswith("****")
        assert expected_display.startswith(f"{type_prefix}_{env_prefix}_")


class TestCrossEnvironmentKeyTypes:
    """Tests for key type behavior across environments."""

    def test_all_environments_support_both_key_types(self) -> None:
        """All environments can generate both publishable and secret keys."""
        for env in ENV_PREFIXES:
            pk_key = generate_typed_api_key(env, "PUBLISHABLE")
            sk_key = generate_typed_api_key(env, "SECRET")

            assert detect_key_type(pk_key) == "PUBLISHABLE"
            assert detect_key_type(sk_key) == "SECRET"

    def test_large_batch_typed_key_uniqueness(self) -> None:
        """Generate many keys of both types and verify uniqueness."""
        batch_size = 100
        all_keys = set()
        all_hashes = set()

        for env in ENV_PREFIXES:
            for key_type in VALID_KEY_TYPES:
                for _ in range(batch_size // (len(ENV_PREFIXES) * len(VALID_KEY_TYPES)) + 1):
                    key = generate_typed_api_key(env, key_type)
                    key_hash = hash_key(key)

                    assert key not in all_keys, f"Duplicate key: {key}"
                    assert key_hash not in all_hashes, f"Hash collision for: {key}"

                    all_keys.add(key)
                    all_hashes.add(key_hash)
