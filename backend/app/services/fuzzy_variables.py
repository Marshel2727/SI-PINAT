from app.repositories.store import rows
from app.services._draft_config import begin, finish, upsert_owned
from app.core.errors import fail

def listing(db, version_id):
    return rows(db,"fuzzy_variables",model_version_id=version_id)

def save(db, version_id, values, user):
    config=begin(db,version_id)
    if len({v["code"] for v in values})!=len(values):
        fail(422,"Kode variabel duplikat.")
    payload=[{**v,"model_version_id":version_id} for v in values]
    upsert_owned(db,"fuzzy_variables",config["variables"],payload)
    return finish(db,version_id,"fuzzy_variables",user,config["variables"],values)
