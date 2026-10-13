from app.repositories.store import rows, one, add, remove_where
from app.services._draft_config import begin, finish
from app.core.errors import fail

def listing(db, version_id):
    return rows(db,"course_weights",model_version_id=version_id)

def save(db, version_id, values, user):
    config=begin(db,version_id)
    keys=[(v["course_id"],v["specialization_id"]) for v in values]
    if len(set(keys))!=len(keys):
        fail(422,"Pasangan mata kuliah dan peminatan duplikat.")
    for value in values:
        if not one(db,"courses",id=value["course_id"]) or not one(db,"specializations",id=value["specialization_id"],is_active=True):
            fail(422,"Mata kuliah atau peminatan tidak dikenal.")
    remove_where(db,"course_weights",model_version_id=version_id)
    for value in values:
        add(db,"course_weights",model_version_id=version_id,**value)
    return finish(db,version_id,"course_weights",user,config["course_weights"],values)
