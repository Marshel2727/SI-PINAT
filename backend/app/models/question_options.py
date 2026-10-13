from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

question_options = Table("question_options", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("question_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("label", CHAR(1), nullable=False),
    Column("option_text", Text, nullable=False),
    Column("is_correct", Boolean, nullable=False, server_default=text("FALSE")),
    UniqueConstraint("question_id", "label", name="uq_question_options_1"),
    UniqueConstraint("question_id", "id", name="uq_question_options_2"),
    ForeignKeyConstraint(["question_id"], ["questions.id"], name="fk_question_options_question_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
