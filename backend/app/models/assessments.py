from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

assessments = Table("assessments", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("public_id", CHAR(36), nullable=False),
    Column("student_id", mysql.BIGINT(unsigned=True), nullable=True),
    Column("preferred_specialization_id", mysql.BIGINT(unsigned=True), nullable=True),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("access_token_hash", CHAR(64), nullable=False),
    Column("mode", Enum('DEMO', 'FULL'), nullable=False),
    Column("status", Enum('DRAFT', 'ACADEMIC_READY', 'IN_PROGRESS', 'COMPLETED'), nullable=False),
    Column("current_semester", mysql.TINYINT(unsigned=True), nullable=False),
    Column("question_count", mysql.SMALLINT(unsigned=True), nullable=False),
    Column("created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("completed_at", DateTime, nullable=True),
    Column("expires_at", DateTime, nullable=True),
    UniqueConstraint("public_id", name="uq_assessments_1"),
    UniqueConstraint("access_token_hash", name="uq_assessments_2"),
    UniqueConstraint("id", "model_version_id", name="uq_assessments_3"),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_assessments_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["preferred_specialization_id"], ["specializations.id"], name="fk_assessments_preferred_specialization_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["student_id"], ["students.id"], name="fk_assessments_student_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("current_semester BETWEEN 1 AND 14", name="ck_assessments_1"),
    CheckConstraint("question_count > 0", name="ck_assessments_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
