# Reusable CDK constructs for orb-integration-hub
# Note: Directory named 'shared_constructs' to avoid conflict with 'constructs' package
from .tagged_resource import TaggedConstruct

__all__ = ["TaggedConstruct"]
