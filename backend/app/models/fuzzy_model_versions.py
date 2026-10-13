from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

fuzzy_model_versions = Table("fuzzy_model_versions", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("version_code", String(32), nullable=False),
    Column("method", Enum('MAMDANI'), nullable=False),
    Column("defuzzification", Enum('CENTROID'), nullable=False),
    Column("sampling_step", Numeric(8,5), nullable=False),
    Column("status", Enum('DRAFT', 'PUBLISHED', 'ARCHIVED'), nullable=False),
    Column("created_by", mysql.BIGINT(unsigned=True), nullable=False),
    Column("created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("published_at", DateTime, nullable=True),
    UniqueConstraint("version_code", name="uq_fuzzy_model_versions_1"),
    ForeignKeyConstraint(["created_by"], ["admin_users.id"], name="fk_fuzzy_model_versions_created_by", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("sampling_step BETWEEN 0.01 AND 1", name="ck_fuzzy_model_versions_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
