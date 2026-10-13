from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

recommendation_scores = Table("recommendation_scores", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("run_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("specialization_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("academic_score", Numeric(7,4), nullable=False),
    Column("competency_score", Numeric(7,4), nullable=False),
    Column("suitability_score", Numeric(8,5), nullable=False),
    Column("rank_position", mysql.SMALLINT(unsigned=True), nullable=False),
    Column("reason", Text, nullable=False),
    UniqueConstraint("run_id", "specialization_id", name="uq_recommendation_scores_1"),
    ForeignKeyConstraint(["specialization_id"], ["specializations.id"], name="fk_recommendation_scores_specialization_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["run_id"], ["recommendation_runs.id"], name="fk_recommendation_scores_run_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("academic_score BETWEEN 0 AND 100", name="ck_recommendation_scores_1"),
    CheckConstraint("competency_score BETWEEN 0 AND 100", name="ck_recommendation_scores_2"),
    CheckConstraint("suitability_score BETWEEN 0 AND 100", name="ck_recommendation_scores_3"),
    CheckConstraint("rank_position > 0", name="ck_recommendation_scores_4"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
