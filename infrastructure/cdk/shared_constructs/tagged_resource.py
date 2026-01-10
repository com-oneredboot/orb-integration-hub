"""Base construct that applies standard tags to all resources."""

from aws_cdk import Tags
from constructs import Construct

from ..config import Config


class TaggedConstruct(Construct):
    """Base construct that automatically applies standard tags.

    All constructs should inherit from this to ensure consistent tagging
    across all resources in the stack.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: Config,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.config = config
        self._apply_standard_tags()

    def _apply_standard_tags(self) -> None:
        """Apply standard tags to this construct and all children."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)
