from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

course_weights = Table("course_weights", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("course_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("specialization_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("weight", Numeric(6,5), nullable=False),
    Column("is_required", Boolean, nullable=False, server_default=text("FALSE")),
    UniqueConstraint("model_version_id", "course_id", "specialization_id", name="uq_course_weights_1"),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_course_weights_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["specialization_id"], ["specializations.id"], name="fk_course_weights_specialization_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["course_id"], ["courses.id"], name="fk_course_weights_course_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("weight BETWEEN 0 AND 1", name="ck_course_weights_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
