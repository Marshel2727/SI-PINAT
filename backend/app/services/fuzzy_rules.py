from app.repositories.store import rows, one, add, remove_where
from app.services._draft_config import begin, finish
from app.core.errors import fail

def listing(db, version_id):
    return rows(db,"fuzzy_rules",model_version_id=version_id)

def save(db, version_id, values, user):
    config=begin(db,version_id)
    by_id={s["id"]:s for s in config["sets"]}
    variables={v["code"]:v["id"] for v in config["variables"]}
    keys=[(v["specialization_id"],v["rule_code"]) for v in values]
    if len(set(keys))!=len(keys):
        fail(422,"Kode aturan duplikat.")
    for value in values:
        for field,role in [("academic_set_id","ACADEMIC"),("competency_set_id","COMPETENCY"),("output_set_id","SUITABILITY")]:
            if value[field] not in by_id or by_id[value[field]]["variable_id"]!=variables.get(role):
                fail(422,"Set aturan tidak sesuai variabel atau versi model.")
        if not one(db,"specializations",id=value["specialization_id"],is_active=True):
            fail(422,"Peminatan tidak aktif.")
    remove_where(db,"fuzzy_rules",model_version_id=version_id)
    for value in values:
        add(db,"fuzzy_rules",model_version_id=version_id,**value)
    return finish(db,version_id,"fuzzy_rules",user,config["rules"],values)
