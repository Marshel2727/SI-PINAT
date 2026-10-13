from sqlalchemy import Table, Column, String, CHAR, Text, Boolean, DateTime, JSON, Numeric, Enum, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, text
from sqlalchemy.dialects import mysql

from app.models.metadata import metadata

fuzzy_rules = Table("fuzzy_rules", metadata,
    Column("id", mysql.BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True),
    Column("model_version_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("specialization_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("rule_code", String(12), nullable=False),
    Column("academic_set_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("competency_set_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("output_set_id", mysql.BIGINT(unsigned=True), nullable=False),
    Column("operator", Enum('AND', 'OR'), nullable=False),
    Column("rule_weight", Numeric(6,5), nullable=False),
    UniqueConstraint("model_version_id", "specialization_id", "rule_code", name="uq_fuzzy_rules_1"),
    ForeignKeyConstraint(["output_set_id"], ["fuzzy_sets.id"], name="fk_fuzzy_rules_output_set_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["competency_set_id"], ["fuzzy_sets.id"], name="fk_fuzzy_rules_competency_set_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["academic_set_id"], ["fuzzy_sets.id"], name="fk_fuzzy_rules_academic_set_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["specialization_id"], ["specializations.id"], name="fk_fuzzy_rules_specialization_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    ForeignKeyConstraint(["model_version_id"], ["fuzzy_model_versions.id"], name="fk_fuzzy_rules_model_version_id", ondelete="RESTRICT", onupdate="RESTRICT"),
    CheckConstraint("rule_weight BETWEEN 0 AND 1", name="ck_fuzzy_rules_1"),
    mysql_engine="InnoDB", mysql_charset="utf8mb4", mysql_collate="utf8mb4_0900_ai_ci",
)
