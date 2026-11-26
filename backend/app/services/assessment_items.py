import json
import random
from app.repositories.store import rows, one, add
from app.core.errors import fail
from app.services.assessment_grades import readiness
from app.services.question_options import listing


def _parse_option_order(raw):
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, ValueError):
            return None
    return raw if isinstance(raw, list) else None


def _ordered_options(raw_options, option_order):
    order = _parse_option_order(option_order)
    if not order:
        return raw_options
    by_id = {opt["id"]: opt for opt in raw_options}
    ordered = []
    seen = set()
    for oid in order:
        if oid in by_id and oid not in seen:
            ordered.append(by_id[oid])
            seen.add(oid)
    for opt in raw_options:
        if opt["id"] not in seen:
            ordered.append(opt)
    return [{**opt, "label": chr(65 + idx)} for idx, opt in enumerate(ordered)]


def start(db, value):
    if value["status"] == "COMPLETED":
        fail(409, "Asesmen sudah selesai. Tes kompetensi hanya dapat dikerjakan 1 kali.")
    existing = rows(db, "assessment_items", assessment_id=value["id"])
    if existing:
        return items(db, value)
    if not readiness(db, value)["ready"]:
        fail(422, "Lengkapi nilai wajib dan preferensi sebelum tes.")
    rng = random.SystemRandom()
    selected = []
    for spec in rows(db, "specializations", is_active=True):
        questions = sorted(
            rows(db, "questions", specialization_id=spec["id"], status="PUBLISHED"),
            key=lambda q: (q["code"], -q["revision"]),
        )
        unique = {}
        for q in questions:
            unique.setdefault(q["code"], q)
        pool = list(unique.values())
        if len(pool) < 10:
            fail(
                503,
                "Paket soal belum lengkap untuk " + spec["name"] + ".",
                "QUESTION_BANK_NOT_READY",
            )
        packet = rng.sample(pool, 10) if len(pool) > 10 else list(pool)
        selected.extend(packet)
    if len(selected) != value["question_count"]:
        fail(409, "Jumlah paket tidak sesuai konfigurasi asesmen.")
    rng.shuffle(selected)
    for order, question in enumerate(selected, 1):
        option_ids = [o["id"] for o in rows(db, "question_options", question_id=question["id"])]
        rng.shuffle(option_ids)
        add(
            db,
            "assessment_items",
            assessment_id=value["id"],
            question_id=question["id"],
            order_no=order,
            max_points=1,
            option_order=option_ids,
        )
    return items(db, value)


def items(db, value):
    values = sorted(
        rows(db, "assessment_items", assessment_id=value["id"]),
        key=lambda i: i["order_no"],
    )
    output = []
    represented = set()
    for item in values:
        question = one(db, "questions", id=item["question_id"])
        spec = one(db, "specializations", id=question["specialization_id"])
        answer = one(db, "assessment_answers", assessment_item_id=item["id"])
        representative = spec["id"] not in represented
        represented.add(spec["id"])
        output.append({
            **item,
            "prompt": question["prompt"],
            "specialization_code": spec["code"],
            "specialization_name": spec["name"],
            "is_representative": representative,
            "options": _ordered_options(listing(db, question["id"]), item.get("option_order")),
            "answer": {k: answer[k] for k in ["option_id", "answer_source"]} if answer else None,
        })
    return output
