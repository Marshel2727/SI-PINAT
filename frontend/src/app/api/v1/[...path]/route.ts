import {NextRequest} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const excluded=new Set(["connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailer","transfer-encoding","upgrade","host","content-length","content-encoding","set-cookie"]);
async function proxy(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 const {path}=await params;
 if(path.some(p=>p==="."||p===".."||p.includes("/")||p.includes("\\")))return Response.json({error:{message:"Path tidak valid."}},{status:400});
 const base=process.env.API_INTERNAL_URL||"http://127.0.0.1:8000";
 const url=new URL("/api/v1/"+path.map(encodeURIComponent).join("/")+request.nextUrl.search,base);
 const headers=new Headers();
 for(const [key,value] of request.headers) if(!excluded.has(key.toLowerCase())&&!["forwarded","x-forwarded-for","x-forwarded-host"].includes(key.toLowerCase()))headers.set(key,value);
 const length=Number(request.headers.get("content-length")||0);
 if(length>11*1024*1024)return Response.json({error:{message:"Maksimal ukuran berkas 10 MB."}},{status:413});
 try {
  let body:ArrayBuffer|undefined;
  if(!["GET","HEAD"].includes(request.method)){
    const chunks:Uint8Array[]=[];let total=0;const reader=request.body?.getReader();
    if(reader){while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>11*1024*1024){await reader.cancel();return Response.json({error:{message:"Permintaan terlalu besar."}},{status:413});}chunks.push(value);}}
    body=new ArrayBuffer(total);const combined=new Uint8Array(body);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength;}
  }
  const upstream=await fetch(url,{method:request.method,headers,body,cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(60000)});
  const outgoing=new Headers();
  for(const [key,value] of upstream.headers)if(!excluded.has(key.toLowerCase()))outgoing.set(key,value);
  for(const value of upstream.headers.getSetCookie())outgoing.append("Set-Cookie",value);
  outgoing.set("Cache-Control","no-store");
  return new Response(upstream.body,{status:upstream.status,headers:outgoing});
 }catch{return Response.json({error:{code:"BACKEND_UNAVAILABLE",message:"Layanan backend belum tersedia. Coba lagi sebentar.",details:[]}},{status:503});}
}
export {proxy as GET,proxy as POST,proxy as PUT,proxy as PATCH,proxy as DELETE};
