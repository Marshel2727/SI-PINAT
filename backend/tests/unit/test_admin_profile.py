import importlib
import importlib.util
import os
import sys
import types
import unittest
from datetime import timedelta
from unittest.mock import patch

os.environ.setdefault("APP_SECRET", "unit-test-only-secret-at-least-32-characters")
os.environ.setdefault("DB_PASSWORD", "unit-test-no-live-database")
os.environ.setdefault("PUBLIC_ORIGIN", "http://testserver")

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import Integer, MetaData, create_engine
from sqlalchemy.sql.sqltypes import Integer as IntegerType

from app.repositories import store
from app.schemas.inputs import AdminPasswordChange, AdminProfileUpdate


def _install_argon2_stub_if_missing():
    if importlib.util.find_spec("argon2") is not None:
        return []

    class StubVerificationError(Exception):
        pass

    class StubPasswordHasher:
        def hash(self, password: str) -> str:
            return f"stub-argon2:{password}"

        def verify(self, stored_hash: str, password: str) -> bool:
            if stored_hash == f"stub-argon2:{password}":
                return True
            raise StubVerificationError("Invalid password")

    argon2_mod = types.ModuleType("argon2")
    argon2_mod.PasswordHasher = StubPasswordHasher
    exc_mod = types.ModuleType("argon2.exceptions")
    exc_mod.VerificationError = StubVerificationError
    return [patch.dict(sys.modules, {"argon2": argon2_mod, "argon2.exceptions": exc_mod})]


def _fake_request(token: str = ""):
    cookies = {"sipinat_admin": token} if token else {}
    return types.SimpleNamespace(cookies=cookies)


class AdminProfileUnitTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.addCleanup(self.engine.dispose)

        metadata = MetaData()
        tables = {}
        for name, tbl in store.TABLES.items():
            copied = tbl.to_metadata(metadata)
            for column in copied.columns:
                if isinstance(column.type, IntegerType):
                    column.type = Integer()
            tables[name] = copied
        metadata.create_all(self.engine)

        table_patch = patch.dict(store.TABLES, tables)
        table_patch.start()
        self.addCleanup(table_patch.stop)

        for stub_patch in _install_argon2_stub_if_missing():
            stub_patch.start()
            self.addCleanup(stub_patch.stop)

        self.security = importlib.import_module("app.core.security")
        self.admin_sessions = importlib.import_module("app.services.admin_sessions")
        self.admin_users = importlib.import_module("app.services.admin_users")

        self.current_token = "current-session-token"
        self.other_token = "other-session-token"
        self.initial_password = "OldPassword123!"

        with self.engine.begin() as db:
            self.admin_id = store.add(
                db,
                "admin_users",
                full_name="Koordinator Teknik Komputer",
                email="admin@unm.ac.id",
                password_hash=self.security.passwords.hash(self.initial_password),
                is_active=True,
            )
            now_dt = store.now()
            self.current_session_id = store.add(
                db,
                "admin_sessions",
                admin_id=self.admin_id,
                token_hash=self.security.digest(self.current_token),
                expires_at=now_dt + timedelta(hours=8),
            )
            self.other_session_id = store.add(
                db,
                "admin_sessions",
                admin_id=self.admin_id,
                token_hash=self.security.digest(self.other_token),
                expires_at=now_dt + timedelta(hours=6),
            )

    def _admin_row(self, db):
        return store.one(db, "admin_users", id=self.admin_id)

    def test_profile_snapshot_returns_account_and_session_metadata(self):
        with self.engine.begin() as db:
            user = self._admin_row(db)
            snapshot = self.admin_users.profile_snapshot(
                db,
                _fake_request(self.current_token),
                user,
            )
        self.assertEqual(snapshot["email"], "admin@unm.ac.id")
        self.assertEqual(snapshot["full_name"], "Koordinator Teknik Komputer")
        self.assertTrue(snapshot["is_active"])
        self.assertEqual(snapshot["active_sessions_count"], 2)
        self.assertIsNotNone(snapshot["session_expires_at"])
        self.assertIsNotNone(snapshot["last_login_at"])

    def test_update_profile_persists_full_name_and_audits(self):
        with self.engine.begin() as db:
            user = self._admin_row(db)
            updated = self.admin_users.update_profile(
                db,
                _fake_request(self.current_token),
                user,
                "  Dr. Ahmad Fauzi, M.T.  ",
            )
            logs = store.rows(db, "audit_logs", entity_table="admin_users", action="UPDATE")

        self.assertEqual(updated["full_name"], "Dr. Ahmad Fauzi, M.T.")
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["after_data"]["full_name"], "Dr. Ahmad Fauzi, M.T.")

    def test_change_password_rejects_wrong_current_password_with_400(self):
        with self.engine.begin() as db:
            user = self._admin_row(db)
            with self.assertRaises(HTTPException) as ctx:
                self.admin_users.change_password(
                    db,
                    _fake_request(self.current_token),
                    user,
                    "WrongPassword!",
                    "NewSecurePass123!",
                )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail["code"], "INVALID_CURRENT_PASSWORD")

    def test_change_password_updates_hash_and_revokes_other_sessions(self):
        with self.engine.begin() as db:
            user = self._admin_row(db)
            result = self.admin_users.change_password(
                db,
                _fake_request(self.current_token),
                user,
                self.initial_password,
                "NewSecurePass123!",
            )
            current_session = store.one(db, "admin_sessions", id=self.current_session_id)
            other_session = store.one(db, "admin_sessions", id=self.other_session_id)
            logs = store.rows(db, "audit_logs", entity_table="admin_users", action="CHANGE_PASSWORD")
            auth_user = self.admin_users.authenticate(db, "admin@unm.ac.id", "NewSecurePass123!")

        self.assertEqual(result["revoked_other_sessions"], 1)
        self.assertIsNone(current_session["revoked_at"])
        self.assertIsNotNone(other_session["revoked_at"])
        self.assertEqual(auth_user["id"], self.admin_id)
        self.assertEqual(len(logs), 1)
        self.assertNotIn("password_hash", str(logs[0]["after_data"]))

    def test_revoke_other_sessions_preserves_current_session(self):
        with self.engine.begin() as db:
            user = self._admin_row(db)
            res = self.admin_sessions.revoke_others(db, _fake_request(self.current_token), user)
            current_session = store.one(db, "admin_sessions", id=self.current_session_id)
            other_session = store.one(db, "admin_sessions", id=self.other_session_id)

        self.assertEqual(res["revoked_count"], 1)
        self.assertIsNone(current_session["revoked_at"])
        self.assertIsNotNone(other_session["revoked_at"])

    def test_schemas_validate_profile_and_password_rules(self):
        profile = AdminProfileUpdate(full_name="  Admin Baru  ")
        self.assertEqual(profile.full_name, "Admin Baru")

        with self.assertRaises(ValidationError):
            AdminPasswordChange(
                current_password="Password1",
                new_password="Password2",
                confirm_password="MismatchPassword",
            )

        with self.assertRaises(ValidationError):
            AdminPasswordChange(
                current_password="SamePassword1!",
                new_password="SamePassword1!",
                confirm_password="SamePassword1!",
            )

        with self.assertRaises(ValidationError):
            AdminPasswordChange(
                current_password="OldPassword1!",
                new_password="short",
                confirm_password="short",
            )


if __name__ == "__main__":
    unittest.main()
