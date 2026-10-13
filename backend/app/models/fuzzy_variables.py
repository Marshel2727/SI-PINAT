from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

fuzzy_variables = Table("fuzzy_variables", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("code", Enum('ACADEMIC', 'COMPETENCY', 'SUITABILITY'), nullable=False),
    Column("direction", Enum('INPUT', 'OUTPUT'), nullable=False),
    Column("domain_min", Numeric(7,4), nullable=False),
    Column("domain_max", Numeric(7,4), nullable=False),
    UniqueConstraint("model_version_id", "code", name="uq_fuzzy_variables_1"),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_fuzzy_variables_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("domain_min >= 0 AND domain_max <= 100 AND domain_min < domain_max", name="ck_fuzzy_variables_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
