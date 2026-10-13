from app.repositories.store import rows, add, remove_where, one
from app.core.errors import fail
from sqlalchemy import select
from app.repositories.store import table

def listing(db, question_id, reveal=False):
    return [{k:v for k,v in option.items() if reveal or k!="is_correct"} for option in rows(db,"question_options",question_id=question_id)]

def replace(db, question_id, options):
    question=db.execute(select(table("questions")).where(table("questions").c.id==question_id).with_for_update()).mappings().first()
    if not question or question["status"]!="DRAFT":
        fail(409,"Opsi soal terpublikasi terkunci.")
    if len(options)<2 or sum(o["is_correct"] for o in options)!=1 or len({o["label"] for o in options})!=len(options):
        fail(422,"Soal harus memiliki opsi unik dan tepat satu kunci.")
    remove_where(db,"question_options",question_id=question_id)
    for value in options:
        add(db,"question_options",question_id=question_id,**value)
    return listing(db,question_id,True)
