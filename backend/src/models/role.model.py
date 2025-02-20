from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

@dataclass
class Role:
    role_id: string
    application_id: string
    role_name: string
    role_type: string
    permissions: List[]
    created_at: number
    updated_at: number
    active: boolean

    @classmethod
    def from_dynamodb(cls, item: dict) -> "Role":
        deserializer = TypeDeserializer()
        return cls(**{
            k: deserializer.deserialize(v)
            for k, v in item.items()
        })

    def to_dynamodb(self) -> dict:
        serializer = TypeSerializer()
        return {
            k: serializer.serialize(v)
            for k, v in self.__dict__.items()
        }