from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

fuzzy_traces = Table("fuzzy_traces", metadata,
    Column("score_id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=False),
    Column("memberships", JSON, nullable=False),
    Column("rule_activations", JSON, nullable=False),
    Column("aggregated_curve", JSON, nullable=False),
    Column("centroid_numerator", Numeric(20,10), nullable=False),
    Column("centroid_denominator", Numeric(20,10), nullable=False),
    Column("sampling_step", Numeric(8,5), nullable=False),
    ForeignKeyConstraint(["score_id"], ["recommendation_scores.id"], name="fk_fuzzy_traces_score_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("centroid_denominator > 0", name="ck_fuzzy_traces_1"),
    CheckConstraint("sampling_step BETWEEN 0.01 AND 1", name="ck_fuzzy_traces_2"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
