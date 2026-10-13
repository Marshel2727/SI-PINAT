"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useAssessment} from "./context";
import {send} from "@/lib/api";
import {names,descriptions,icons} from "@/lib/format";
import {Field,Notice,ErrorNotice} from "@/components/ui";
export function Preference(){
 const {assessment,base,reload}=useAssessment();
 const [selected,setSelected]=useState(assessment.preferred_specialization_code||"");
 const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
 const router=useRouter();
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  if(!selected){setError(new Error("Pilih satu peminatan terlebih dahulu."));return;}
  const form=new FormData(event.currentTarget);setBusy(true);setError(null);
  try{await send(base+"/profile",{semester:Number(form.get("semester")),nim:assessment.student?.nim||null,full_name:assessment.student?.full_name||null,class_name:assessment.student?.class_name||null,preferred_specialization_code:selected},"PATCH");await reload();router.push("/asesmen/"+assessment.public_id+"/nilai");}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 return <><span className="eyebrow">TAHAP 1 DARI 4</span><h1>Pilih Peminatan yang Paling Kamu Minati</h1><p className="lead">Pilihan awal dicatat sebagai pembanding. Rekomendasi dihitung dari nilai akademik dan tes kompetensi.</p><Notice>Memilih suatu peminatan tidak menambah skornya dan tidak memecahkan hasil seri.</Notice><form onSubmit={save}><div className="three-columns">{Object.entries(names).map(([code,name])=><label className={"card specialization selectable "+(selected===code?"selected":"")} key={code}><div className="spread"><span className="mono">{code}</span><input type="radio" name="preference" value={code} checked={selected===code} onChange={()=>setSelected(code)}/></div><div className="title-icon"><span className="icon-box"><img src={"/images/"+icons[code]} alt=""/></span><h2>{name}</h2></div><p>{descriptions[code]}</p>{selected===code&&<span className="badge demo">Terpilih sebagai preferensi awal</span>}</label>)}</div><div className="card section"><Field label="Semester saat ini"><input name="semester" type="number" min="1" max="14" defaultValue={assessment.current_semester} required/></Field>{assessment.student&&<p>{assessment.student.full_name} · NIM {assessment.student.nim}</p>}</div><ErrorNotice error={error}/><div className="actions end"><button disabled={busy}>{busy?"Menyimpan…":"Simpan dan lanjut ke nilai →"}</button></div></form></>;
}
