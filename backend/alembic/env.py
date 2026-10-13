from alembic import context
from app.db.session import engine
from app.models import metadata

def run():
    if context.is_offline_mode():
        raise RuntimeError("Gunakan koneksi MySQL untuk migrasi.")
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()

run()
