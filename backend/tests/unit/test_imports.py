import importlib
import importlib.util
import io
import os
import sys
import types
import unittest
from unittest.mock import patch

os.environ.setdefault("APP_SECRET", "unit-test-only-secret-at-least-32-characters")
os.environ.setdefault("DB_PASSWORD", "unit-test-no-live-database")
os.environ.setdefault("PUBLIC_ORIGIN", "http://testserver")

HAS_OPENPYXL = importlib.util.find_spec("openpyxl") is not None
if HAS_OPENPYXL:
    from openpyxl import Workbook
else:
    Workbook = None


class ImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        stubs = {}
        if importlib.util.find_spec("argon2") is None:
            argon2_mod = types.ModuleType("argon2")
            argon2_mod.PasswordHasher = lambda: object()
            exc_mod = types.ModuleType("argon2.exceptions")
            exc_mod.VerificationError = Exception
            stubs["argon2"] = argon2_mod
            stubs["argon2.exceptions"] = exc_mod
        if not HAS_OPENPYXL:
            openpyxl_mod = types.ModuleType("openpyxl")
            openpyxl_mod.Workbook = object
            openpyxl_mod.load_workbook = lambda *args, **kwargs: None
            stubs["openpyxl"] = openpyxl_mod
        if stubs:
            p = patch.dict(sys.modules, stubs)
            p.start()
            cls.addClassCleanup(p.stop)
        mod = importlib.import_module("app.services.transcript_imports")
        cls.parse = staticmethod(mod.parse)
        cls.export_text = staticmethod(mod.export_text)

    def test_csv_headers_and_zero_prefixed_codes(self):
        content = "semester,kode_mk,nama_mk,nilai_huruf\n1,001,Pengantar,A\n".encode()
        self.assertEqual(self.parse("grades.csv", content, "text/csv")[0]["kode_mk"], "001")
        with self.assertRaises(ValueError):
            self.parse("grades.csv", b"wrong,header\nx,y", "text/csv")

    def test_csv_accepts_unm_12_letter_grades(self):
        grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"]
        lines = ["semester,kode_mk,nama_mk,nilai_huruf"]
        for idx, letter in enumerate(grades, 1):
            lines.append(f"1,MK{idx:03d},Mata Kuliah {idx},{letter}")
        rows = self.parse("unm.csv", "\n".join(lines).encode("utf-8"), "text/csv")
        self.assertEqual([r["nilai_huruf"] for r in rows], grades)

    def test_extension_formula_and_limit(self):
        with self.assertRaises(ValueError):
            self.parse("grades.pdf", b"%PDF", "application/pdf")
        with self.assertRaises(ValueError):
            self.parse("grades.csv", b"x" * 10485761, "text/csv")
        content = "semester,kode_mk,nama_mk,nilai_huruf\n1,001,=HYPERLINK(\"x\"),A\n".encode()
        with self.assertRaises(ValueError):
            self.parse("grades.csv", content, "text/csv")

    @unittest.skipIf(Workbook is None, "openpyxl tidak terpasang di environment lokal")
    def test_xlsx_formulas_and_structure(self):
        workbook = Workbook()
        workbook.active.append(["semester", "kode_mk", "nama_mk", "nilai_huruf"])
        workbook.active.append([1, "001", "Pengantar", "=1+1"])
        content = io.BytesIO()
        workbook.save(content)
        with self.assertRaises(ValueError):
            self.parse(
                "grades.xlsx",
                content.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        with self.assertRaises(ValueError):
            self.parse("grades.xlsx", b"not a zip", "application/octet-stream")

    def test_export_formula_injection(self):
        for value in ["=1+1", "+SUM(A1)", "@CMD", "-1+2", "  =1"]:
            self.assertTrue(self.export_text(value).startswith("'"))
        self.assertEqual(self.export_text("001234"), "001234")
        self.assertEqual(self.export_text(3), 3)
