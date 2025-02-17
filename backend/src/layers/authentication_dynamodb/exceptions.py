# file: backend/infrastructure/layers/database/python/database/exceptions.py
# author: Corey Dale Peters
# created: 2025-02-17
# description: This module contains exceptions for database operations

class DatabaseError(Exception):
    """Base exception for database operations"""
    pass

class RecordNotFoundError(DatabaseError):
    """Exception raised when a record is not found"""
    pass