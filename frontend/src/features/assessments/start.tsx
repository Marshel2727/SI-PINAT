"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {send} from "@/lib/api";
import {Field,ErrorNotice,Modal,Notice} from "@/components/ui";
export function StartAssessment(){
 const [open,setOpen]=useState(false),[mode,setMode]=useState("DEMO"),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
 const router=useRouter();
 async function start(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError(null);
  const form=new FormData(event.currentTarget);
  try{
   const {data}=await send("/assessments",{mode,semester:Number(form.get("semester")),nim:mode==="FULL"?form.get("nim"):null,full_name:mode==="FULL"?form.get("full_name"):null,class_name:mode==="FULL"?(form.get("class_name")||null):null});
   router.push("/asesmen/"+data.public_id+"/peminatan");
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 return <><button onClick={()=>setOpen(true)}>Mulai Asesmen Mandiri <img src="/images/1dcbd.svg" alt="" width="16" height="16"/></button><Modal open={open} title="Mulai asesmen" onClose={()=>!busy&&setOpen(false)}><form onSubmit={start}><div className="tabs" role="group" aria-label="Mode asesmen">{["DEMO","FULL"].map(m=><button type="button" className={mode===m?"":"secondary"} key={m} onClick={()=>setMode(m)}>{m==="DEMO"?"Coba DEMO":"Asesmen FULL"}</button>)}</div><Notice>{mode==="DEMO"?"DEMO memakai tiga jawaban Anda dan 27 jawaban contoh yang ditandai EXAMPLE.":"FULL memerlukan identitas, nilai akademik, dan seluruh 30 jawaban nyata."}</Notice>{mode==="FULL"&&<><Field label="NIM"><input name="nim" required maxLength={20} autoComplete="username"/></Field><Field label="Nama lengkap"><input name="full_name" required maxLength={120} autoComplete="name"/></Field><Field label="Kelas (opsional)"><input name="class_name" maxLength={40}/></Field></>}<Field label="Semester saat ini"><input name="semester" type="number" min="1" max="14" defaultValue="4" required/></Field><ErrorNotice error={error}/><button disabled={busy} className="full">{busy?"Menyiapkan sesi…":"Lanjut ke peminatan awal"}</button></form></Modal></>;
}
