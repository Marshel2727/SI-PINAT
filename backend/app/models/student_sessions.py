from sqlalchemy import Table, Column, CHAR, DateTime, ForeignKeyConstraint, UniqueConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

student_sessions = Table(
    "student_sessions",
    metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("student_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("token_hash", CHAR(64), nullable=False),
    Column("expires_at", DateTime, nullable=False),
    Column("revoked_at", DateTime, nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("token_hash", name="uq_student_sessions_1"),
    ForeignKeyConstraint(
        ["student_id"],
        ["students.id"],
        name="fk_student_sessions_student_id",
        ondelete="RESTRICT",
        onupdate="RESTRICT",
    ),
    mysql_engine="InnoDB",
    mysql_charset="utf8mb4",
    mysql_collate="utf8mb4_0900_ai_ci",
)
