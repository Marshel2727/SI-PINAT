from fastapi import HTTPException

def fail(status, message, code="INVALID_REQUEST", details=None):
    raise HTTPException(status, detail={"code": code, "message": message, "details": details or []})
