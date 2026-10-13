import io
import unittest
from openpyxl import Workbook, load_workbook
from app.services.transcript_imports import parse, export_text

class ImportTests(unittest.TestCase):
    def test_csv_headers_and_zero_prefixed_codes(self):
        content="semester,kode_mk,nama_mk,nilai_huruf\n1,001,Pengantar,A\n".encode()
        self.assertEqual(parse("grades.csv",content,"text/csv")[0]["kode_mk"],"001")
        with self.assertRaises(ValueError):
            parse("grades.csv",b"wrong,header\nx,y","text/csv")

    def test_extension_formula_and_limit(self):
        with self.assertRaises(ValueError):
            parse("grades.pdf",b"%PDF","application/pdf")
        with self.assertRaises(ValueError):
            parse("grades.csv",b"x"*10485761,"text/csv")
        content="semester,kode_mk,nama_mk,nilai_huruf\n1,001,=HYPERLINK(\"x\"),A\n".encode()
        with self.assertRaises(ValueError):
            parse("grades.csv",content,"text/csv")

    def test_xlsx_formulas_and_structure(self):
        workbook=Workbook()
        workbook.active.append(["semester","kode_mk","nama_mk","nilai_huruf"])
        workbook.active.append([1,"001","Pengantar","=1+1"])
        content=io.BytesIO()
        workbook.save(content)
        with self.assertRaises(ValueError):
            parse("grades.xlsx",content.getvalue(),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        with self.assertRaises(ValueError):
            parse("grades.xlsx",b"not a zip","application/octet-stream")

    def test_export_formula_injection(self):
        for value in ["=1+1","+SUM(A1)","@CMD","-1+2","  =1"]:
            self.assertTrue(export_text(value).startswith("'"))
        self.assertEqual(export_text("001234"),"001234")
        self.assertEqual(export_text(3),3)
