from app.repositories.store import rows, add, audit, remove_where
from app.services._draft_config import begin, finish
from app.core.errors import fail

UNM_GRADE_CONVERSIONS = (
    ("A", 4.00, 100.00),
    ("A-", 3.75, 93.75),
    ("B+", 3.25, 81.25),
    ("B", 3.00, 75.00),
    ("B-", 2.75, 68.75),
    ("C+", 2.25, 56.25),
    ("C", 2.00, 50.00),
    ("C-", 1.75, 43.75),
    ("D+", 1.25, 31.25),
    ("D", 1.00, 25.00),
    ("D-", 0.75, 18.75),
    ("E", 0.00, 0.00),
)
# Peraturan Rektor UNM Nomor 2 Tahun 2025 Pasal 37 ayat (6) & (7):
# Nilai C-, D+, D, D-, dan E dinyatakan tidak lulus.
UNM_FAILING_GRADES = frozenset({"C-", "D+", "D", "D-", "E"})
GRADE_RANK = {g: i for i, g in enumerate(["A+", *(x[0] for x in UNM_GRADE_CONVERSIONS), "F"])}


def is_passing_grade(letter_grade: str) -> bool:
    """Return True when the UNM letter grade is passing (C or higher)."""
    return str(letter_grade).strip().upper() not in UNM_FAILING_GRADES


def sort_conversions(items):
    """Sort grade conversions from highest points to lowest using official UNM rank."""
    return sorted(
        items,
        key=lambda c: (
            -float(c["grade_points"]),
            GRADE_RANK.get(str(c["letter_grade"]).strip().upper(), 99),
            str(c["letter_grade"]).strip().upper(),
        ),
    )


def listing(db, version_id):
    return sort_conversions(rows(db, "grade_conversions", model_version_id=version_id))


def save(db, version_id, values, user):
    config = begin(db, version_id)
    normalized = [{**v, "letter_grade": v["letter_grade"].strip().upper()} for v in values]
    if len({v["letter_grade"] for v in normalized}) != len(normalized):
        fail(422, "Nilai huruf duplikat.")
    remove_where(db, "grade_conversions", model_version_id=version_id)
    for value in normalized:
        add(db, "grade_conversions", model_version_id=version_id, **value)
    return finish(db, version_id, "grade_conversions", user, config["grade_conversions"], normalized)


def sync_unm_grades(db, version_id, user):
    """Add missing official 12-level UNM letter grades without altering or deleting existing rows."""
    from app.services.fuzzy_model_versions import configuration, model

    model(db, version_id, lock=True)
    current = rows(db, "grade_conversions", model_version_id=version_id)
    existing = {str(r["letter_grade"]).strip().upper() for r in current}
    added = []
    for letter, points, normalized in UNM_GRADE_CONVERSIONS:
        if letter in existing:
            continue
        add(
            db,
            "grade_conversions",
            model_version_id=version_id,
            letter_grade=letter,
            grade_points=points,
            normalized_score=normalized,
        )
        added.append(letter)
    if added:
        audit(db, user, "SYNC_UNM_GRADES", "grade_conversions", version_id, after={"added_grades": added})
    return configuration(db, version_id)
