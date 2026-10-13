from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

fuzzy_sets = Table("fuzzy_sets", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("variable_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("code", Enum('LOW', 'MEDIUM', 'HIGH'), nullable=False),
    Column("shape", Enum('TRIANGLE', 'TRAPEZOID'), nullable=False),
    Column("point_a", Numeric(7,4), nullable=False),
    Column("point_b", Numeric(7,4), nullable=False),
    Column("point_c", Numeric(7,4), nullable=False),
    Column("point_d", Numeric(7,4), nullable=True),
    UniqueConstraint("variable_id", "code", name="uq_fuzzy_sets_1"),
    ForeignKeyConstraint(["variable_id"], ["fuzzy_variables.id"], name="fk_fuzzy_sets_variable_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("point_a <= point_b AND point_b <= point_c", name="ck_fuzzy_sets_1"),
    CheckConstraint("(shape = 'TRIANGLE' AND point_d IS NULL) OR (shape = 'TRAPEZOID' AND point_d IS NOT NULL AND point_c <= point_d)", name="ck_fuzzy_sets_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
