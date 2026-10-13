from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

assessment_answers = Table("assessment_answers", metadata,
    Column("assessment_item_id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=False),
    Column("question_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("option_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("answer_source", Enum('USER', 'EXAMPLE'), nullable=False),
    Column("awarded_points", Numeric(7,4), nullable=False),
    Column("answered_at", DateTime, nullable=False),
    ForeignKeyConstraint(["question_id","option_id"], ["question_options.question_id","question_options.id"], name="fk_assessment_answers_option_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["assessment_item_id","question_id"], ["assessment_items.id","assessment_items.question_id"], name="fk_assessment_answers_assessment_item_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("awarded_points BETWEEN 0 AND 100", name="ck_assessment_answers_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
