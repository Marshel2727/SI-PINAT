from sqlalchemy import create_engine
from app.core.config import settings

engine = create_engine(settings().database_url, pool_pre_ping=True, pool_recycle=1800)

def database():
    with engine.connect() as connection:
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
