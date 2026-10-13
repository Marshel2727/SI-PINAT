from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

fuzzy_validation_cases = Table("fuzzy_validation_cases", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("specialization_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("case_code", String(32), nullable=False),
    Column("academic_input", Numeric(7,4), nullable=False),
    Column("competency_input", Numeric(7,4), nullable=False),
    Column("expected_min", Numeric(8,5), nullable=False),
    Column("expected_max", Numeric(8,5), nullable=False),
    Column("last_actual_score", Numeric(8,5), nullable=True),
    Column("last_passed", Boolean, nullable=True),
    Column("last_tested_at", DateTime, nullable=True),
    UniqueConstraint("model_version_id", "specialization_id", "case_code", name="uq_fuzzy_validation_cases_1"),
    ForeignKeyConstraint(["specialization_id"], ["specializations.id"], name="fk_fuzzy_validation_cases_specialization_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_fuzzy_validation_cases_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("academic_input BETWEEN 0 AND 100", name="ck_fuzzy_validation_cases_1"),
    CheckConstraint("competency_input BETWEEN 0 AND 100", name="ck_fuzzy_validation_cases_2"),
    CheckConstraint("expected_min >= 0 AND expected_max <= 100 AND expected_min <= expected_max", name="ck_fuzzy_validation_cases_3"),
    CheckConstraint("last_actual_score IS NULL OR last_actual_score BETWEEN 0 AND 100", name="ck_fuzzy_validation_cases_4"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
