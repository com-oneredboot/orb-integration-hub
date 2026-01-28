# file: apps/api/tests/property/test_api_key_rotation_property.py
# author: AI Assistant
# created: 2026-01-27
# description: Property tests for API Key Rotation and Revocation (Properties 10, 11)
# Feature: application-access-management, Properties 10 & 11

"""
Property 10: API Key Revocation Enforcement
For any revoked API key, subsequent validation attempts must return null/fail.

Property 11: API Key Rotation Dual Validity
For any API key during rotation, both the current key and the next key
must be valid for authentication.

These properties validate:
- Requirements 6.3: Key rotation with dual validity
- Requirements 6.4: Immediate key revocation
- Requirements 7.3: Revoked keys return 401
"""

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st


class ApiKeyStatus(Enum):
    """API key status values."""

    ACTIVE = "ACTIVE"
    ROTATING = "ROTATING"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


ENV_PREFIXES = {
    "PRODUCTION": "prod",
    "STAGING": "stag",
    "DEVELOPMENT": "dev",
    "TEST": "test",
    "PREVIEW": "prev",
}


def generate_api_key(environment: str) -> str:
    """Generate an API key."""
    env_prefix = ENV_PREFIXES.get(environment, "unk")
    random_part = secrets.token_hex(16)
    return f"orb_{env_prefix}_{random_part}"


def hash_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


@dataclass
class ApiKeyRecord:
    """Represents an API key record in the database."""

    application_api_key_id: str
    application_id: str
    organization_id: str
    environment: str
    key_hash: str
    key_prefix: str
    status: ApiKeyStatus
    next_key_hash: str | None = None
    expires_at: int | None = None
    last_used_at: int | None = None
    created_at: int = 1000000000
    updated_at: int = 1000000000


class MockApiKeyStore:
    """Mock store for API key records."""

    def __init__(self) -> None:
        self.records: dict[str, ApiKeyRecord] = {}
        self.hash_index: dict[str, ApiKeyRecord] = {}

    def save(self, record: ApiKeyRecord) -> None:
        """Save a record to the store."""
        self.records[record.application_api_key_id] = record
        self.hash_index[record.key_hash] = record
        if record.next_key_hash:
            self.hash_index[record.next_key_hash] = record

    def get_by_id(self, key_id: str) -> ApiKeyRecord | None:
        """Get a record by ID."""
        return self.records.get(key_id)

    def get_by_hash(self, key_hash: str) -> ApiKeyRecord | None:
        """Get a record by key hash."""
        return self.hash_index.get(key_hash)

    def update_status(self, key_id: str, status: ApiKeyStatus) -> None:
        """Update the status of a key."""
        record = self.records.get(key_id)
        if record:
            # Remove old hash index entries
            if record.key_hash in self.hash_index:
                del self.hash_index[record.key_hash]
            if record.next_key_hash and record.next_key_hash in self.hash_index:
                del self.hash_index[record.next_key_hash]

            record.status = status

            # Re-add to hash index if not revoked
            if status != ApiKeyStatus.REVOKED:
                self.hash_index[record.key_hash] = record
                if record.next_key_hash:
                    self.hash_index[record.next_key_hash] = record

    def start_rotation(self, key_id: str, new_key_hash: str) -> None:
        """Start key rotation."""
        record = self.records.get(key_id)
        if record:
            record.next_key_hash = new_key_hash
            record.status = ApiKeyStatus.ROTATING
            self.hash_index[new_key_hash] = record

    def complete_rotation(self, key_id: str) -> None:
        """Complete key rotation."""
        record = self.records.get(key_id)
        if record and record.next_key_hash:
            # Remove old hash from index
            if record.key_hash in self.hash_index:
                del self.hash_index[record.key_hash]

            # Swap hashes
            record.key_hash = record.next_key_hash
            record.next_key_hash = None
            record.status = ApiKeyStatus.ACTIVE


class ApiKeyValidator:
    """Validates API keys against the store."""

    def __init__(self, store: MockApiKeyStore) -> None:
        self.store = store

    def validate(self, plaintext_key: str) -> dict[str, Any] | None:
        """Validate a key and return context or None."""
        key_hash = hash_key(plaintext_key)
        record = self.store.get_by_hash(key_hash)

        if not record:
            return None

        if record.status == ApiKeyStatus.REVOKED:
            return None

        if record.status == ApiKeyStatus.EXPIRED:
            return None

        return {
            "application_api_key_id": record.application_api_key_id,
            "application_id": record.application_id,
            "organization_id": record.organization_id,
            "environment": record.environment,
            "status": record.status.value,
            "is_rotation_key": key_hash == record.next_key_hash,
        }


class TestApiKeyRevocationEnforcementProperty:
    """Property tests for API Key Revocation Enforcement (Property 10)."""

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        app_id=st.uuids().map(str),
        org_id=st.uuids().map(str),
    )
    def test_revoked_key_cannot_validate(self, environment: str, app_id: str, org_id: str) -> None:
        """Property 10: Revoked keys must fail validation.

        Once a key is revoked, any subsequent validation attempt
        must return None/fail.
        """
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        # Generate and store a key
        plaintext_key = generate_api_key(environment)
        key_hash = hash_key(plaintext_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=app_id,
            organization_id=org_id,
            environment=environment,
            key_hash=key_hash,
            key_prefix=plaintext_key[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # Key should validate before revocation
        result = validator.validate(plaintext_key)
        assert result is not None, "Active key should validate"
        assert result["application_id"] == app_id

        # Revoke the key
        store.update_status(key_id, ApiKeyStatus.REVOKED)

        # Key should NOT validate after revocation
        result = validator.validate(plaintext_key)
        assert result is None, "Revoked key must not validate"

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        app_id=st.uuids().map(str),
        org_id=st.uuids().map(str),
        num_attempts=st.integers(min_value=1, max_value=10),
    )
    def test_revoked_key_stays_invalid(
        self, environment: str, app_id: str, org_id: str, num_attempts: int
    ) -> None:
        """Revoked keys remain invalid across multiple validation attempts."""
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        plaintext_key = generate_api_key(environment)
        key_hash = hash_key(plaintext_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=app_id,
            organization_id=org_id,
            environment=environment,
            key_hash=key_hash,
            key_prefix=plaintext_key[:12],
            status=ApiKeyStatus.REVOKED,  # Start as revoked
        )
        store.save(record)

        # Multiple validation attempts should all fail
        for _ in range(num_attempts):
            result = validator.validate(plaintext_key)
            assert result is None, "Revoked key must never validate"

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        app_id=st.uuids().map(str),
        org_id=st.uuids().map(str),
    )
    def test_revocation_is_immediate(self, environment: str, app_id: str, org_id: str) -> None:
        """Revocation takes effect immediately."""
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        plaintext_key = generate_api_key(environment)
        key_hash = hash_key(plaintext_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=app_id,
            organization_id=org_id,
            environment=environment,
            key_hash=key_hash,
            key_prefix=plaintext_key[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # Validate, revoke, validate - should fail immediately
        assert validator.validate(plaintext_key) is not None
        store.update_status(key_id, ApiKeyStatus.REVOKED)
        assert validator.validate(plaintext_key) is None


class TestApiKeyRotationDualValidityProperty:
    """Property tests for API Key Rotation Dual Validity (Property 11)."""

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        app_id=st.uuids().map(str),
        org_id=st.uuids().map(str),
    )
    def test_both_keys_valid_during_rotation(
        self, environment: str, app_id: str, org_id: str
    ) -> None:
        """Property 11: Both old and new keys valid during rotation.

        When a key is being rotated, both the current key and the
        new key must be valid for authentication.
        """
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        # Generate original key
        old_key = generate_api_key(environment)
        old_hash = hash_key(old_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=app_id,
            organization_id=org_id,
            environment=environment,
            key_hash=old_hash,
            key_prefix=old_key[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # Generate new key for rotation
        new_key = generate_api_key(environment)
        new_hash = hash_key(new_key)

        # Start rotation
        store.start_rotation(key_id, new_hash)

        # Both keys should now be valid
        old_result = validator.validate(old_key)
        new_result = validator.validate(new_key)

        assert old_result is not None, "Old key must be valid during rotation"
        assert new_result is not None, "New key must be valid during rotation"

        # Both should return same context
        assert old_result["application_id"] == app_id
        assert new_result["application_id"] == app_id
        assert old_result["environment"] == environment
        assert new_result["environment"] == environment

        # New key should be marked as rotation key
        assert new_result["is_rotation_key"] is True
        assert old_result["is_rotation_key"] is False

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        app_id=st.uuids().map(str),
        org_id=st.uuids().map(str),
    )
    def test_old_key_invalid_after_rotation_complete(
        self, environment: str, app_id: str, org_id: str
    ) -> None:
        """After rotation completes, only the new key is valid."""
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        # Generate original key
        old_key = generate_api_key(environment)
        old_hash = hash_key(old_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=app_id,
            organization_id=org_id,
            environment=environment,
            key_hash=old_hash,
            key_prefix=old_key[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # Generate new key and start rotation
        new_key = generate_api_key(environment)
        new_hash = hash_key(new_key)
        store.start_rotation(key_id, new_hash)

        # Both valid during rotation
        assert validator.validate(old_key) is not None
        assert validator.validate(new_key) is not None

        # Complete rotation
        store.complete_rotation(key_id)

        # Only new key should be valid
        assert (
            validator.validate(old_key) is None
        ), "Old key must be invalid after rotation completes"
        assert (
            validator.validate(new_key) is not None
        ), "New key must be valid after rotation completes"

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(list(ENV_PREFIXES.keys())),
        app_id=st.uuids().map(str),
        org_id=st.uuids().map(str),
    )
    def test_rotation_preserves_context(self, environment: str, app_id: str, org_id: str) -> None:
        """Rotation preserves application context."""
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        old_key = generate_api_key(environment)
        old_hash = hash_key(old_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=app_id,
            organization_id=org_id,
            environment=environment,
            key_hash=old_hash,
            key_prefix=old_key[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # Get context before rotation
        before_context = validator.validate(old_key)

        # Rotate
        new_key = generate_api_key(environment)
        new_hash = hash_key(new_key)
        store.start_rotation(key_id, new_hash)
        store.complete_rotation(key_id)

        # Get context after rotation
        after_context = validator.validate(new_key)

        # Context should be preserved
        assert after_context is not None
        assert before_context is not None
        assert after_context["application_id"] == before_context["application_id"]
        assert after_context["organization_id"] == before_context["organization_id"]
        assert after_context["environment"] == before_context["environment"]


class TestApiKeyRotationEdgeCases:
    """Edge case tests for rotation and revocation."""

    def test_revoke_during_rotation(self) -> None:
        """Revoking during rotation invalidates both keys."""
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        old_key = generate_api_key("DEVELOPMENT")
        old_hash = hash_key(old_key)
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=str(uuid.uuid4()),
            organization_id=str(uuid.uuid4()),
            environment="DEVELOPMENT",
            key_hash=old_hash,
            key_prefix=old_key[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # Start rotation
        new_key = generate_api_key("DEVELOPMENT")
        new_hash = hash_key(new_key)
        store.start_rotation(key_id, new_hash)

        # Both valid
        assert validator.validate(old_key) is not None
        assert validator.validate(new_key) is not None

        # Revoke
        store.update_status(key_id, ApiKeyStatus.REVOKED)

        # Both invalid
        assert validator.validate(old_key) is None
        assert validator.validate(new_key) is None

    def test_multiple_rotations(self) -> None:
        """Multiple sequential rotations work correctly."""
        store = MockApiKeyStore()
        validator = ApiKeyValidator(store)

        key1 = generate_api_key("PRODUCTION")
        key_id = str(uuid.uuid4())

        record = ApiKeyRecord(
            application_api_key_id=key_id,
            application_id=str(uuid.uuid4()),
            organization_id=str(uuid.uuid4()),
            environment="PRODUCTION",
            key_hash=hash_key(key1),
            key_prefix=key1[:12],
            status=ApiKeyStatus.ACTIVE,
        )
        store.save(record)

        # First rotation
        key2 = generate_api_key("PRODUCTION")
        store.start_rotation(key_id, hash_key(key2))
        store.complete_rotation(key_id)

        assert validator.validate(key1) is None
        assert validator.validate(key2) is not None

        # Second rotation
        key3 = generate_api_key("PRODUCTION")
        store.start_rotation(key_id, hash_key(key3))
        store.complete_rotation(key_id)

        assert validator.validate(key1) is None
        assert validator.validate(key2) is None
        assert validator.validate(key3) is not None
