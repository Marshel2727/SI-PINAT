"""Ensure all model versions include all 12 official UNM letter grades."""
from alembic import op
from sqlalchemy import text

from app.services.grade_conversions import UNM_GRADE_CONVERSIONS

revision = "0002_unm_grade_conversions"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    model_ids = [
        row[0]
        for row in bind.execute(
            text("SELECT DISTINCT model_version_id FROM grade_conversions ORDER BY model_version_id")
        ).fetchall()
    ]
    for model_version_id in model_ids:
        existing = {
            str(row[0]).strip().upper()
            for row in bind.execute(
                text("SELECT letter_grade FROM grade_conversions WHERE model_version_id = :model_version_id"),
                {"model_version_id": model_version_id},
            ).fetchall()
        }
        for letter, points, normalized in UNM_GRADE_CONVERSIONS:
            if letter in existing:
                continue
            bind.execute(
                text(
                    "INSERT INTO grade_conversions "
                    "(model_version_id, letter_grade, grade_points, normalized_score) "
                    "VALUES (:model_version_id, :letter_grade, :grade_points, :normalized_score)"
                ),
                {
                    "model_version_id": model_version_id,
                    "letter_grade": letter,
                    "grade_points": points,
                    "normalized_score": normalized,
                },
            )


def downgrade():
    raise RuntimeError("Downgrade destruktif dinonaktifkan; gunakan backup dan migrasi koreksi.")
