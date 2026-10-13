from app.repositories.store import audit, change, add
from app.services.fuzzy_model_versions import model, invalidate, configuration
from app.core.errors import fail

def begin(db, version_id):
    model(db,version_id,draft=True,lock=True)
    return configuration(db,version_id)

def finish(db, version_id, name, user, before, after):
    invalidate(db,version_id)
    audit(db,user,"UPDATE_CONFIG",name,version_id,before,after)
    return configuration(db,version_id)

def upsert_owned(db, name, before, values):
    ids={r["id"] for r in before}
    submitted={v["id"] for v in values if v.get("id")}
    if not submitted.issubset(ids):
        fail(422,"ID konfigurasi bukan bagian model ini.")
    if ids-submitted:
        fail(409,"Pertahankan ID yang sudah ada; buat versi baru untuk penghapusan struktur.")
    for value in values:
        value=dict(value)
        key=value.pop("id",None)
        change(db,name,key,**value) if key else add(db,name,**value)
