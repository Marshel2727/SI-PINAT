from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

assessment_items = Table("assessment_items", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("assessment_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("question_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("order_no", mysql.SMALLINT(unsigned=True), nullable=False),
    Column("max_points", Numeric(7,4), nullable=False),
    UniqueConstraint("assessment_id", "question_id", name="uq_assessment_items_1"),
    UniqueConstraint("assessment_id", "order_no", name="uq_assessment_items_2"),
    UniqueConstraint("id", "question_id", name="uq_assessment_items_3"),
    ForeignKeyConstraint(["question_id"], ["questions.id"], name="fk_assessment_items_question_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["assessment_id"], ["assessments.id"], name="fk_assessment_items_assessment_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("order_no > 0", name="ck_assessment_items_1"),
    CheckConstraint("max_points > 0 AND max_points <= 100", name="ck_assessment_items_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
