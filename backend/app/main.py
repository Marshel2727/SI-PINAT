import logging
import uuid
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.api.v1.router import router

logging.basicConfig(level=logging.INFO,format="%(asctime)s %(levelname)s %(message)s")
logger=logging.getLogger("sipinat")
app=FastAPI(title="SI-PINAT API",version="1.0.0")
app.include_router(router)

def error_response(request,status,code,message,details=None):
    return JSONResponse({"error":{"code":code,"message":message,"details":details or [],
                                 "request_id":getattr(request.state,"request_id","unknown")}},status_code=status)

@app.middleware("http")
async def request_context(request:Request,call_next):
    request.state.request_id=uuid.uuid4().hex
    length=request.headers.get("content-length")
    if length and (not length.isdigit() or int(length)>11*1024*1024):
        return error_response(request,413,"FILE_TOO_LARGE","Permintaan terlalu besar.")
    response=await call_next(request)
    response.headers["X-Request-ID"]=request.state.request_id
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["X-Frame-Options"]="DENY"
    response.headers["Cache-Control"]="no-store"
    logger.info("request_id=%s method=%s status=%s",request.state.request_id,request.method,response.status_code)
    return response

@app.exception_handler(HTTPException)
async def http_error(request,exc):
    detail=exc.detail if isinstance(exc.detail,dict) else {"code":"HTTP_ERROR","message":str(exc.detail)}
    return error_response(request,exc.status_code,detail.get("code","HTTP_ERROR"),detail.get("message","Permintaan gagal."),detail.get("details"))

@app.exception_handler(RequestValidationError)
async def validation_error(request,exc):
    details=[{"field":".".join(str(v) for v in e["loc"]),"message":e["msg"]} for e in exc.errors()]
    return error_response(request,422,"VALIDATION_ERROR","Periksa kembali data formulir.",details)

@app.exception_handler(IntegrityError)
async def conflict(request,exc):
    return error_response(request,409,"DATA_CONFLICT","Data duplikat atau masih dirujuk oleh data lain.")

@app.exception_handler(SQLAlchemyError)
async def database_error(request,exc):
    logger.error("request_id=%s database_error=%s",getattr(request.state,"request_id","unknown"),type(exc).__name__)
    return error_response(request,503,"DATABASE_UNAVAILABLE","Database belum dapat melayani permintaan.")

@app.exception_handler(Exception)
async def unexpected(request,exc):
    logger.error("request_id=%s error=%s",getattr(request.state,"request_id","unknown"),type(exc).__name__)
    return error_response(request,500,"INTERNAL_ERROR","Terjadi kesalahan. Catat ID permintaan dan hubungi admin.")


class BodyLimitMiddleware:
    def __init__(self,app):
        self.app=app

    async def __call__(self,scope,receive,send):
        if scope["type"]!="http" or scope["method"] in {"GET","HEAD","OPTIONS"}:
            return await self.app(scope,receive,send)
        messages=[]
        size=0
        while True:
            message=await receive()
            if message["type"]=="http.disconnect":
                return
            size+=len(message.get("body",b""))
            if size>11*1024*1024:
                response=JSONResponse({"error":{"code":"FILE_TOO_LARGE","message":"Permintaan terlalu besar.","details":[],"request_id":uuid.uuid4().hex}},status_code=413)
                return await response(scope,receive,send)
            messages.append(message)
            if not message.get("more_body",False):
                break
        async def replay():
            if messages:
                return messages.pop(0)
            return await receive()
        await self.app(scope,replay,send)

app.add_middleware(BodyLimitMiddleware)
