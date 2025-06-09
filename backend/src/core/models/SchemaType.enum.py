from enum import Enum

class SchemaType(Enum):
    standard = "standard"
    dynamodb = "dynamodb"
    postgres = "postgres"
    mysql = "mysql"
    mssql = "mssql"
    sqlite = "sqlite"
    lambda = "lambda"
    graphql = "graphql"
    registry = "registry"
    graph = "graph"
    rest = "rest"
    elasticsearch = "elasticsearch"
 