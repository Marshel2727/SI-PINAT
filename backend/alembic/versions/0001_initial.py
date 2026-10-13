"""Initial SI-PINAT schema: exact 23 tables / 34 foreign keys from RAG."""
from pathlib import Path
from alembic import op
from app.models import metadata

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    sql = Path(__file__).with_suffix(".sql").read_text(encoding="utf-8")
    for statement in sql.split(";"):
        if statement.strip():
            op.get_bind().exec_driver_sql(statement)

def downgrade():
    raise RuntimeError("Downgrade destruktif dinonaktifkan; gunakan backup dan migrasi koreksi.")
