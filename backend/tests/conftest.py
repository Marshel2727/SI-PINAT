import os

os.environ.setdefault("APP_SECRET","unit-test-only-secret-at-least-32-characters")
os.environ.setdefault("DB_PASSWORD","unit-test-no-live-database")
os.environ.setdefault("PUBLIC_ORIGIN","http://testserver")
