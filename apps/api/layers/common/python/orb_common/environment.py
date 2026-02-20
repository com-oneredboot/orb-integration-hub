"""Environment designator enum for the orb ecosystem."""

from enum import Enum


class EnvironmentDesignator(str, Enum):
    """
    Standard environment designators per orb-schema-generator v0.9.0.

    Values:
        DEV: Development environment
        STG: Staging environment
        UAT: User acceptance testing environment
        QA: Quality assurance environment
        PRD: Production environment
    """

    DEV = "dev"
    STG = "stg"
    UAT = "uat"
    QA = "qa"
    PRD = "prd"

    @classmethod
    def from_string(cls, value: str) -> "EnvironmentDesignator":
        """
        Parse a string into an EnvironmentDesignator (case-insensitive).

        Args:
            value: String to parse (e.g., "dev", "DEV", "Dev")

        Returns:
            EnvironmentDesignator enum member

        Raises:
            ValueError: If value is not a valid environment designator
        """
        normalized = value.lower().strip()
        for member in cls:
            if member.value == normalized:
                return member
        valid_values = [m.value for m in cls]
        raise ValueError(
            f"Invalid environment designator: '{value}'. "
            f"Valid options are: {', '.join(valid_values)}"
        )

    @classmethod
    def values(cls) -> list[str]:
        """Return list of all valid environment designator values."""
        return [member.value for member in cls]
