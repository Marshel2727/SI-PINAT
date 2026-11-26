"""Add student account fields, student_sessions table, and assessment_items.option_order."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "0003_student_accounts"
down_revision = "0002_unm_grade_conversions"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    student_cols = {col["name"] for col in inspector.get_columns("students")}
    if "study_program" not in student_cols:
        op.add_column(
            "students",
            sa.Column("study_program", sa.String(64), nullable=False, server_default="TEKOM"),
        )
    if "password_hash" not in student_cols:
        op.add_column(
            "students",
            sa.Column("password_hash", sa.String(255), nullable=True),
        )
    if "is_active" not in student_cols:
        op.add_column(
            "students",
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        )

    if not inspector.has_table("student_sessions"):
        op.create_table(
            "student_sessions",
            sa.Column(
                "id",
                sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
                nullable=False,
                primary_key=True,
                autoincrement=True,
            ),
            sa.Column(
                "student_id",
                sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
                nullable=False,
            ),
            sa.Column("token_hash", sa.CHAR(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("token_hash", name="uq_student_sessions_1"),
            sa.ForeignKeyConstraint(
                ["student_id"],
                ["students.id"],
                name="fk_student_sessions_student_id",
                ondelete="RESTRICT",
                onupdate="RESTRICT",
            ),
            mysql_engine="InnoDB",
            mysql_charset="utf8mb4",
            mysql_collate="utf8mb4_0900_ai_ci",
        )

    item_cols = {col["name"] for col in inspector.get_columns("assessment_items")}
    if "option_order" not in item_cols:
        op.add_column(
            "assessment_items",
            sa.Column("option_order", sa.JSON(), nullable=True),
        )


def downgrade():
    raise RuntimeError("Downgrade destruktif dinonaktifkan; gunakan backup dan migrasi koreksi.")
