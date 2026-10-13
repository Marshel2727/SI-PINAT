from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

audit_logs = Table("audit_logs", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("admin_id", mysql.BIGINT(unsigned=True), nullable=True),
    Column("action", String(80), nullable=False),
    Column("entity_table", String(80), nullable=False),
    Column("entity_id", mysql.BIGINT(unsigned=True), nullable=True),
    Column("before_data", JSON, nullable=True),
    Column("after_data", JSON, nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    ForeignKeyConstraint(["admin_id"], ["admin_users.id"], name="fk_audit_logs_admin_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
