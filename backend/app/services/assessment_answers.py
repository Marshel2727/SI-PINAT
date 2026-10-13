from app.repositories.store import rows, one, add, change, now
from app.services.assessment_items import items
from app.core.errors import fail

def save(db, value, item_id, option_id, source="USER"):
    if value["status"] not in {"ACADEMIC_READY","IN_PROGRESS"}:
        fail(409,"Sesi belum siap atau sudah selesai.")
    item=one(db,"assessment_items",id=item_id,assessment_id=value["id"])
    option=one(db,"question_options",id=option_id)
    if not item or not option or option["question_id"]!=item["question_id"]:
        fail(422,"Opsi bukan bagian soal asesmen ini.","INVALID_OPTION")
    if source=="EXAMPLE" and value["mode"]!="DEMO":
        fail(403,"Jawaban contoh hanya untuk DEMO.")
    answer=one(db,"assessment_answers",assessment_item_id=item_id)
    payload={"question_id":item["question_id"],"option_id":option_id,"answer_source":source,
             "awarded_points":item["max_points"] if option["is_correct"] else 0,"answered_at":now()}
    if answer:
        change(db,"assessment_answers",item_id,**payload)
    else:
        add(db,"assessment_answers",assessment_item_id=item_id,**payload)
    change(db,"assessments",value["id"],status="IN_PROGRESS",updated_at=now())
    return {"item_id":item_id,"option_id":option_id,"answer_source":source,"saved":True}

def examples(db, value):
    if value["mode"]!="DEMO":
        fail(403,"FULL tidak menerima jawaban contoh.")
    packet=items(db,value)
    representatives=[i for i in packet if i["is_representative"]]
    if len(representatives)!=3 or any(not i["answer"] or i["answer"]["answer_source"]!="USER" for i in representatives):
        fail(422,"Jawab tiga soal perwakilan sebelum memuat jawaban contoh.")
    for item in packet:
        if item["answer"]:
            continue
        options=rows(db,"question_options",question_id=item["question_id"])
        intended_correct=item["order_no"]%10 < 7
        selected=next((o for o in options if bool(o["is_correct"])==intended_correct),options[0])
        save(db,value,item["id"],selected["id"],"EXAMPLE")
    return items(db,value)
