import os
from pathlib import Path
import pytest

@pytest.fixture(scope="session")
def prepared_database():
    # Only a dedicated, empty test database is accepted. No drops or downgrades.
    if not os.environ.get("DB_NAME","").endswith("_test"):
        pytest.fail("Integration tests require a dedicated DB_NAME ending in _test.")
    from sqlalchemy import inspect
    from alembic import command
    from alembic.config import Config
    from app.db.session import engine
    if inspect(engine).get_table_names():
        pytest.fail("Test database must be empty. Use the disposable compose.test.yaml stack.")
    config=Config(str(Path(__file__).resolve().parents[2]/"alembic.ini"))
    command.upgrade(config,"head")
    from app.repositories.store import add, one, rows
    from app.core.security import passwords
    from app.cli.seed_demo import seed
    from app.services.questions import set_status
    from app.services.fuzzy_model_versions import clone, publish
    from app.services.fuzzy_validation_cases import validate
    with engine.begin() as db:
        identifier=add(db,"admin_users",full_name="Integration Test",email="test@example.invalid",password_hash=passwords.hash("test-only-password"),is_active=True)
        user=one(db,"admin_users",id=identifier)
        demo=seed(db,user)
        for question in rows(db,"questions",status="DRAFT"):
            set_status(db,question["id"],"PUBLISHED",user)
        validate(db,demo,user)
        publish(db,demo,True,user)
        full=clone(db,demo,{"version_code":"TEST-APPROVED-001","sampling_step":0.1},user)["id"]
        validate(db,full,user)
        publish(db,full,True,user)
    return engine

@pytest.fixture
def client(prepared_database):
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as client:
        token=client.get("/api/v1/auth/csrf").json()["data"]["csrf_token"]
        client.headers.update({"Origin":os.environ["PUBLIC_ORIGIN"],"X-CSRF-Token":token})
        yield client
