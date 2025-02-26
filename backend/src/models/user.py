from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

@dataclass
class User:
    user_id: string
    cognito_id: string
    email: string
    phone_number: string
    phone_verified: boolean
    first_name: string
    last_name: string
    groups: List[]
    status: string
    created_at: number

    @classmethod
    def from_dynamodb(cls, item: dict) -> "User":
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