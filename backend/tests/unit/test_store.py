import unittest
from unittest.mock import patch

from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine

from app.repositories import store


class StoreNameColumnTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.addCleanup(self.engine.dispose)
        metadata = MetaData()
        courses = Table(
            "store_regression_courses",
            metadata,
            Column("id", Integer, primary_key=True),
            Column("name", String(150), nullable=False),
        )
        metadata.create_all(self.engine)
        registry = patch.dict(store.TABLES, {courses.name: courses})
        registry.start()
        self.addCleanup(registry.stop)
        self.table_name = courses.name

    def test_add_accepts_name_column(self):
        with self.engine.begin() as db:
            identifier = store.add(db, self.table_name, name="Rangkaian Elektronika")
            self.assertEqual(
                store.one(db, self.table_name, id=identifier)["name"],
                "Rangkaian Elektronika",
            )

    def test_change_accepts_name_column(self):
        with self.engine.begin() as db:
            identifier = store.add(db, self.table_name, name="Nama awal")
            store.change(db, self.table_name, identifier, name="Logika Fuzzy")
            self.assertEqual(
                store.one(db, self.table_name, id=identifier)["name"],
                "Logika Fuzzy",
            )


if __name__ == "__main__":
    unittest.main()
