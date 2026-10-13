from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

assessment_grades = Table("assessment_grades", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("assessment_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("course_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("grade_conversion_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("letter_grade", String(3), nullable=False),
    Column("normalized_score", Numeric(7,4), nullable=False),
    Column("credits_snapshot", mysql.TINYINT(unsigned=True), nullable=False),
    Column("course_snapshot", JSON, nullable=False),
    Column("source", Enum('IMPORT', 'MANUAL'), nullable=False),
    Column("updated_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("assessment_id", "course_id", name="uq_assessment_grades_1"),
    ForeignKeyConstraint(["grade_conversion_id"], ["grade_conversions.id"], name="fk_assessment_grades_grade_conversion_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["course_id"], ["courses.id"], name="fk_assessment_grades_course_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["assessment_id"], ["assessments.id"], name="fk_assessment_grades_assessment_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("normalized_score BETWEEN 0 AND 100", name="ck_assessment_grades_1"),
    CheckConstraint("credits_snapshot BETWEEN 1 AND 12", name="ck_assessment_grades_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
