from app.repositories.store import rows, add, remove_where
from app.services._draft_config import begin, finish
from app.core.errors import fail

def listing(db, version_id):
    return rows(db,"grade_conversions",model_version_id=version_id)

def save(db, version_id, values, user):
    config=begin(db,version_id)
    if len({v["letter_grade"] for v in values})!=len(values):
        fail(422,"Nilai huruf duplikat.")
    remove_where(db,"grade_conversions",model_version_id=version_id)
    for value in values:
        add(db,"grade_conversions",model_version_id=version_id,**value)
    return finish(db,version_id,"grade_conversions",user,config["grade_conversions"],values)
