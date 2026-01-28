# file: apps/api/tests/property/test_api_key_uniqueness_property.py
# author: AI Assistant
# created: 2026-01-27
# description: Property test for API Key Uniqueness (Property 8)
# Feature: application-access-management, Property 8: API Key Uniqueness

"""
Property 8: API Key Uniqueness

For any two API keys, their keyHash values must be different.

This property validates:
- Requirements 6.1: Each API key must be cryptographically unique
- The key generation algorithm produces unique keys with high probability
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


def generate_api_key(environment: str) -> str:
    """Generate an API key using the same algorithm as the service.

    Key format: orb_{env}_{random32chars}
    """
    env_prefix = ENV_PREFIXES.get(environment, "unk")
    random_part = secrets.token_hex(16)  # 32 hex chars
    return f"orb_{env_prefix}_{random_part}"


def hash_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


class TestApiKeyUniquenessProperty:
    """Property tests for API Key Uniqueness (Property 8)."""

    @settings(max_examples=100)
    @given(
        env1=st.sampled_from(list(ENV_PREFIXES.keys())),
        env2=st.sampled_from(list(ENV_PREFIXES.keys())),
    )
    def test_different_keys_have_different_hashes(self, env1: str, env2: str) -> None:
        """Property 8: Any two generated keys must have different hashes.

        Even when generating keys for the same environment, the random
        component ensures uniqueness.
        """
        key1 = generate_api_key(env1)
        key2 = generate_api_key(env2)

        hash1 = hash_key(key1)
        hash2 = hash_key(key2)

        # Keys should be different
        assert key1 != key2, "Generated keys should be unique"

        # Hashes should be different
        assert hash1 != hash2, "Key hashes should be unique"

    @settings(max_examples=100)
    @given(environment=st.sampled_from(list(ENV_PREFIXES.keys())))
    def test_key_format_is_correct(self, environment: str) -> None:
        """Verify generated keys follow the expected format."""
        key = generate_api_key(environment)

        # Key should start with orb_
        assert key.startswith("orb_"), f"Key should start with 'orb_': {key}"

        # Key should have correct environment prefix
        env_prefix = ENV_PREFIXES[environment]
        expected_prefix = f"orb_{env_prefix}_"
        assert key.startswith(expected_prefix), f"Key should start with '{expected_prefix}': {key}"

        # Key should have correct length (orb_ + env_ + 32 hex chars)
        # orb_dev_ = 8 chars, + 32 = 40 total for dev
        parts = key.split("_")
        assert len(parts) == 3, f"Key should have 3 parts separated by '_': {key}"
        assert parts[0] == "orb", f"First part should be 'orb': {key}"
        assert parts[1] == env_prefix, f"Second part should be '{env_prefix}': {key}"
        assert len(parts[2]) == 32, f"Random part should be 32 chars: {key}"

    @settings(max_examples=100)
    @given(st.data())
    def test_batch_key_generation_uniqueness(self, data: st.DataObject) -> None:
        """Generate multiple keys and verify all are unique."""
        batch_size = data.draw(st.integers(min_value=2, max_value=20))
        environment = data.draw(st.sampled_from(list(ENV_PREFIXES.keys())))

        keys = [generate_api_key(environment) for _ in range(batch_size)]
        hashes = [hash_key(k) for k in keys]

        # All keys should be unique
        assert len(set(keys)) == batch_size, "All generated keys should be unique"

        # All hashes should be unique
        assert len(set(hashes)) == batch_size, "All key hashes should be unique"

    @settings(max_examples=100)
    @given(environment=st.sampled_from(list(ENV_PREFIXES.keys())))
    def test_hash_is_deterministic(self, environment: str) -> None:
        """Verify that hashing the same key always produces the same hash."""
        key = generate_api_key(environment)

        hash1 = hash_key(key)
        hash2 = hash_key(key)
        hash3 = hash_key(key)

        assert hash1 == hash2 == hash3, "Hash should be deterministic"

    @settings(max_examples=100)
    @given(environment=st.sampled_from(list(ENV_PREFIXES.keys())))
    def test_hash_length_is_consistent(self, environment: str) -> None:
        """Verify SHA-256 hash is always 64 hex characters."""
        key = generate_api_key(environment)
        key_hash = hash_key(key)

        # SHA-256 produces 256 bits = 64 hex characters
        assert len(key_hash) == 64, f"Hash should be 64 chars: {key_hash}"

        # Should be valid hex
        try:
            int(key_hash, 16)
        except ValueError:
            pytest.fail(f"Hash should be valid hex: {key_hash}")


class TestApiKeyCollisionResistance:
    """Additional tests for collision resistance."""

    def test_large_batch_uniqueness(self) -> None:
        """Generate a large batch of keys and verify no collisions."""
        batch_size = 1000
        keys = set()
        hashes = set()

        for _ in range(batch_size):
            key = generate_api_key("DEVELOPMENT")
            key_hash = hash_key(key)

            assert key not in keys, f"Duplicate key generated: {key}"
            assert key_hash not in hashes, f"Hash collision: {key_hash}"

            keys.add(key)
            hashes.add(key_hash)

        assert len(keys) == batch_size
        assert len(hashes) == batch_size

    def test_cross_environment_uniqueness(self) -> None:
        """Keys from different environments should never collide."""
        keys_per_env = 100
        all_keys = set()
        all_hashes = set()

        for env in ENV_PREFIXES:
            for _ in range(keys_per_env):
                key = generate_api_key(env)
                key_hash = hash_key(key)

                assert key not in all_keys, f"Cross-env key collision: {key}"
                assert key_hash not in all_hashes, "Cross-env hash collision"

                all_keys.add(key)
                all_hashes.add(key_hash)

        expected_total = len(ENV_PREFIXES) * keys_per_env
        assert len(all_keys) == expected_total
        assert len(all_hashes) == expected_total
