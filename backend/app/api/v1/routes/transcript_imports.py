from fastapi import APIRouter, Depends, Request, UploadFile, File, Form
from app.db.session import database
from app.core.security import owned, limit
from app.services.transcript_imports import import_file, template
from app.core.errors import fail
from app.api.v1.common import ok, download

router=APIRouter(tags=["transcript_imports"])

@router.get("/assessments/{public_id}/grades/template")
def get_template(public_id:str,request:Request,format:str="csv",db=Depends(database)):
    return download(*template(db,owned(db,request,public_id),format))

@router.post("/assessments/{public_id}/grades/import")
def upload(public_id:str,request:Request,file:UploadFile=File(...),confirm:bool=Form(False),db=Depends(database,scope="function")):
    limit(db,request,"upload",10,300,public_id)
    assessment=owned(db,request,public_id,lock=True)
    content=file.file.read(10*1024*1024+1)
    if len(content)>10*1024*1024:
        fail(422,"Maksimal ukuran berkas 10 MB.")
    return ok(import_file(db,assessment,file.filename,content,file.content_type,confirm))
