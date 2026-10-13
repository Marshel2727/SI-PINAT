from sqlalchemy import select
from app.repositories.store import rows, table
from app.services._draft_config import begin, finish, upsert_owned
from app.core.errors import fail

def listing(db, version_id):
    ids=[v["id"] for v in rows(db,"fuzzy_variables",model_version_id=version_id)]
    return list(db.execute(select(table("fuzzy_sets")).where(table("fuzzy_sets").c.variable_id.in_(ids))).mappings())

def save(db, version_id, values, user):
    config=begin(db,version_id)
    ids={v["id"] for v in config["variables"]}
    if any(v["variable_id"] not in ids for v in values):
        fail(422,"Variabel bukan bagian versi ini.")
    keys=[(v["variable_id"],v["code"]) for v in values]
    if len(set(keys))!=len(keys):
        fail(422,"Set variabel duplikat.")
    upsert_owned(db,"fuzzy_sets",config["sets"],values)
    return finish(db,version_id,"fuzzy_sets",user,config["sets"],values)
