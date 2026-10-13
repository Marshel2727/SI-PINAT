from math import ceil
from app.repositories.store import safe

def ok(data):
    return {"data":safe(data)}

def page(data, number, size, total):
    return {"data":safe(data),"meta":{"page":number,"page_size":size,"total":total,"total_pages":ceil(total/size)}}

def download(content, content_type, filename):
    from fastapi import Response
    return Response(content,media_type=content_type,headers={"Content-Disposition":'attachment; filename="'+filename+'"',"Cache-Control":"no-store"})
