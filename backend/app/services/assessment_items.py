from app.repositories.store import rows, one, add
from app.core.errors import fail
from app.services.assessment_grades import readiness
from app.services.question_options import listing

def start(db, value):
    if value["status"]=="COMPLETED":
        fail(409,"Asesmen sudah selesai.")
    existing=rows(db,"assessment_items",assessment_id=value["id"])
    if existing:
        return items(db,value)
    if not readiness(db,value)["ready"]:
        fail(422,"Lengkapi nilai wajib dan preferensi sebelum tes.")
    selected=[]
    for spec in rows(db,"specializations",is_active=True):
        questions=sorted(rows(db,"questions",specialization_id=spec["id"],status="PUBLISHED"),key=lambda q:(q["code"],-q["revision"]))
        unique={}
        for q in questions:
            unique.setdefault(q["code"],q)
        packet=list(unique.values())[:10]
        if len(packet)!=10:
            fail(503,"Paket soal belum lengkap untuk "+spec["name"]+".","QUESTION_BANK_NOT_READY")
        selected.extend(packet)
    if len(selected)!=value["question_count"]:
        fail(409,"Jumlah paket tidak sesuai konfigurasi asesmen.")
    for order,question in enumerate(selected,1):
        add(db,"assessment_items",assessment_id=value["id"],question_id=question["id"],order_no=order,max_points=1)
    return items(db,value)

def items(db, value):
    values=sorted(rows(db,"assessment_items",assessment_id=value["id"]),key=lambda i:i["order_no"])
    output=[]
    represented=set()
    for item in values:
        question=one(db,"questions",id=item["question_id"])
        spec=one(db,"specializations",id=question["specialization_id"])
        answer=one(db,"assessment_answers",assessment_item_id=item["id"])
        representative=spec["id"] not in represented
        represented.add(spec["id"])
        output.append({**item,"prompt":question["prompt"],"specialization_code":spec["code"],"specialization_name":spec["name"],
                       "is_representative":representative,"options":listing(db,question["id"]),
                       "answer":{k:answer[k] for k in ["option_id","answer_source"]} if answer else None})
    return output
