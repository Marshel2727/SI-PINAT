from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

grade_conversions = Table("grade_conversions", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("letter_grade", String(3), nullable=False),
    Column("grade_points", Numeric(3,2), nullable=False),
    Column("normalized_score", Numeric(7,4), nullable=False),
    UniqueConstraint("model_version_id", "letter_grade", name="uq_grade_conversions_1"),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_grade_conversions_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("grade_points BETWEEN 0 AND 4", name="ck_grade_conversions_1"),
    CheckConstraint("normalized_score BETWEEN 0 AND 100", name="ck_grade_conversions_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
