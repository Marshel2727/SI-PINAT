from app.repositories.store import one, add
from app.core.errors import fail

def identify(db, profile):
    existing = one(db,"students",nim=profile.nim)
    if existing:
        # No anonymous profile overwrite or identity disclosure from an NIM lookup.
        if existing["full_name"].casefold() != profile.full_name.casefold() or (existing["class_name"] or "").casefold() != (profile.class_name or "").casefold():
            fail(422,"Identitas tidak dapat dicocokkan. Periksa data atau hubungi admin.","IDENTITY_MISMATCH")
        return existing["id"]
    return add(db,"students",nim=profile.nim,full_name=profile.full_name,class_name=profile.class_name)
