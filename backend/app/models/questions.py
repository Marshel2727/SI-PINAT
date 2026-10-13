from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

questions = Table("questions", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("specialization_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("code", String(32), nullable=False),
    Column("revision", mysql.INTEGER(unsigned=True), nullable=False),
    Column("prompt", Text, nullable=False),
    Column("explanation", Text, nullable=True),
    Column("status", Enum('DRAFT', 'PUBLISHED', 'ARCHIVED'), nullable=False),
    Column("created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("code", "revision", name="uq_questions_1"),
    ForeignKeyConstraint(["specialization_id"], ["specializations.id"], name="fk_questions_specialization_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("revision > 0", name="ck_questions_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
