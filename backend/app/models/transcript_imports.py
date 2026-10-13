from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

transcript_imports = Table("transcript_imports", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("assessment_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("original_filename", String(255), nullable=False),
    Column("storage_key", String(255), nullable=True),
    Column("file_hash", CHAR(64), nullable=False),
    Column("status", Enum('PENDING', 'VALID', 'INVALID'), nullable=False),
    Column("validation_errors", JSON, nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    ForeignKeyConstraint(["assessment_id"], ["assessments.id"], name="fk_transcript_imports_assessment_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
