from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

courses = Table("courses", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("code", String(20), nullable=False),
    Column("name", String(150), nullable=False),
    Column("semester", mysql.TINYINT(unsigned=True), nullable=False),
    Column("credits", mysql.TINYINT(unsigned=True), nullable=False),
    Column("is_active", Boolean, nullable=False, server_default=text("TRUE")),
    Column("updated_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("code", name="uq_courses_1"),
    CheckConstraint("semester BETWEEN 1 AND 4", name="ck_courses_1"),
    CheckConstraint("credits BETWEEN 1 AND 12", name="ck_courses_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
