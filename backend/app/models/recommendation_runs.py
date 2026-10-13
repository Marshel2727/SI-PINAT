from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

recommendation_runs = Table("recommendation_runs", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("assessment_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("engine_version", String(40), nullable=False),
    Column("status", Enum('SUCCESS', 'FAILED'), nullable=False),
    Column("error_message", Text, nullable=True),
    Column("calculated_at", DateTime, nullable=False),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_recommendation_runs_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["assessment_id","model_version_id"], ["assessments.id","assessments.model_version_id"], name="fk_recommendation_runs_assessment_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
