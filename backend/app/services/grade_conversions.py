from app.repositories.store import rows, add, remove_where
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
GRADE_RANK = {g: i for i, g in enumerate(["A+", *(x[0] for x in UNM_GRADE_CONVERSIONS), "F"])}


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
