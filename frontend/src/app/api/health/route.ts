export const dynamic="force-dynamic";
export async function GET(){
 try{
  const response=await fetch((process.env.API_INTERNAL_URL||"http://127.0.0.1:8000")+"/api/v1/health/ready",{cache:"no-store",signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw new Error("Not ready");
  return Response.json({status:"ready"},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({status:"not_ready"},{status:503,headers:{"Cache-Control":"no-store"}});}
}
