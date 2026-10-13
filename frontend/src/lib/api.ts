import type { Envelope } from "@/types/api";
export class ApiError extends Error {
  constructor(message:string, public status:number, public details:unknown[] = []) { super(message); }
}
let csrfPromise:Promise<string>|null=null;
let csrfTime=0;
async function csrf() {
  if (!csrfPromise || Date.now()-csrfTime>100*60*1000) {
    csrfTime=Date.now();
    csrfPromise=fetch("/api/v1/auth/csrf",{credentials:"same-origin",cache:"no-store"}).then(async r=>{
      if(!r.ok) throw new Error("Layanan belum dapat dihubungi.");
      return (await r.json()).data.csrf_token as string;
    }).catch(e=>{csrfPromise=null;throw e;});
  }
  return csrfPromise;
}
export async function api<T=any>(path:string, init:RequestInit={}, retry=true):Promise<Envelope<T>> {
  const headers=new Headers(init.headers);
  const method=(init.method||"GET").toUpperCase();
  if (!["GET","HEAD"].includes(method)) {
    headers.set("X-CSRF-Token",await csrf());
    if(init.body && !(init.body instanceof FormData)) headers.set("Content-Type","application/json");
  }
  let response:Response;
  try { response=await fetch("/api/v1"+path,{...init,headers,credentials:"same-origin",cache:"no-store"}); }
  catch { throw new ApiError("Layanan belum dapat dihubungi. Periksa koneksi dan coba lagi.",0); }
  if(response.status===204) return {data:null as T};
  const value=await response.json().catch(()=>({error:{message:"Respons layanan tidak valid."}}));
  if(!response.ok) {
    if(response.status===403 && value.error?.code==="CSRF" && retry){csrfPromise=null;return api(path,init,false);}
    throw new ApiError(value.error?.message||"Permintaan gagal.",response.status,value.error?.details||[]);
  }
  return value;
}
export const send = <T=any>(path:string,body?:unknown,method="POST") => api<T>(path,{method,body:body===undefined?undefined:JSON.stringify(body)});
export function prettyError(value:unknown):string {
  return value instanceof Error?value.message:"Terjadi kesalahan.";
}
