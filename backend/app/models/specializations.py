from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

specializations = Table("specializations", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("code", String(30), nullable=False),
    Column("name", String(100), nullable=False),
    Column("description", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default=text("TRUE")),
    UniqueConstraint("code", name="uq_specializations_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
