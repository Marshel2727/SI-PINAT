"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {api,send} from "@/lib/api";
import {Field,Notice,ErrorNotice,Modal} from "@/components/ui";
import {number} from "@/lib/format";
import type {Row} from "@/types/api";
export function Validation({initialModel=""}:{initialModel?:string}){
 const [models,setModels]=useState<Row[]>([]),[modelId,setModelId]=useState(initialModel),[specs,setSpecs]=useState<Row[]>([]),[cases,setCases]=useState<Row[]>([]);
 const [edit,setEdit]=useState<Row|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{api("/admin/fuzzy-models?page_size=100").then(r=>setModels(r.data)).catch(setError);api("/specializations").then(r=>setSpecs(r.data)).catch(setError);},[]);
 useEffect(()=>{if(!modelId)return;setLoading(true);api("/admin/fuzzy-models/"+modelId+"/validation-cases").then(r=>{setCases(r.data);setError(null);}).catch(setError).finally(()=>setLoading(false));},[modelId]);
 const model=models.find(m=>m.id===modelId),locked=model?.status!=="DRAFT";
 async function reload(){setCases((await api("/admin/fuzzy-models/"+modelId+"/validation-cases")).data);}
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!edit)return;setBusy(true);setError(null);
  const form=new FormData(event.currentTarget),body:Row={case_code:form.get("case_code")};
  for(const key of ["specialization_id","academic_input","competency_input","expected_min","expected_max"])body[key]=Number(form.get(key));
  try{await send("/admin/fuzzy-models/"+modelId+"/validation-cases"+(edit.id?"/"+edit.id:""),body,edit.id?"PATCH":"POST");setEdit(null);await reload();setMessage("Skenario tersimpan. Jalankan ulang validasi.");}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 async function validate(){if(busy)return;setBusy(true);setError(null);try{const {data}=await send("/admin/fuzzy-models/"+modelId+"/validate");await reload();setMessage(data.filter((r:Row)=>r.passed).length+" / "+data.length+" skenario lulus.");}catch(e){setError(e);}finally{setBusy(false);}}
 return <><h1>Skenario Validasi Fuzzy</h1><Notice>Ekspektasi ditetapkan dari referensi independen yang telah ditinjau, sebelum menjalankan pengujian.</Notice><Field label="Versi model"><select value={modelId} onChange={e=>{setModelId(e.target.value);setMessage("");}}><option value="">Pilih versi</option>{models.map(m=><option key={m.id} value={m.id}>{m.version_code} · {m.status}</option>)}</select></Field><ErrorNotice error={error}/>{message&&<Notice tone="success">{message}</Notice>}{modelId&&<><div className="actions"><button disabled={locked||busy} onClick={()=>setEdit({})}>+ Tambah skenario</button><button disabled={locked||busy} onClick={validate}>{busy?"Menjalankan…":"Jalankan semua skenario"}</button><Link className="button secondary" href={"/admin/model-fuzzy/"+modelId}>Konfigurasi model</Link></div>{loading&&<Notice>Memuat skenario…</Notice>}<article className="card section">{!loading&&!cases.length?<p>Belum ada skenario pada versi ini.</p>:<div className="table-scroll"><table><thead><tr><th>Kasus</th><th>Peminatan</th><th>X1 / X2</th><th>Ekspektasi</th><th>Aktual</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{cases.map(c=><tr key={c.id}><td>{c.case_code}</td><td>{specs.find(s=>s.id===c.specialization_id)?.name}</td><td>{number(c.academic_input)} / {number(c.competency_input)}</td><td>{number(c.expected_min,5)}–{number(c.expected_max,5)}</td><td>{c.last_actual_score===null?"—":number(c.last_actual_score,5)}</td><td><span className="badge">{c.last_passed===null?"Belum diuji":c.last_passed?"LULUS":"GAGAL"}</span></td><td><button className="secondary compact" disabled={locked||busy} onClick={()=>setEdit(c)}>Edit</button></td></tr>)}</tbody></table></div>}</article></>}<Modal open={!!edit} title="Skenario validasi" onClose={()=>!busy&&setEdit(null)}>{edit&&<form key={edit.id||"new"} onSubmit={save}><Field label="Kode kasus"><input name="case_code" defaultValue={edit.case_code} required maxLength={32}/></Field><Field label="Peminatan"><select name="specialization_id" defaultValue={edit.specialization_id||specs[0]?.id} required>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><div className="two-columns">{[["academic_input","Input akademik X1"],["competency_input","Input kompetensi X2"],["expected_min","Ekspektasi minimum"],["expected_max","Ekspektasi maksimum"]].map(([key,label])=><Field key={key} label={label}><input name={key} type="number" min="0" max="100" step="0.00001" defaultValue={edit[key]} required/></Field>)}</div><ErrorNotice error={error}/><button disabled={busy}>Simpan skenario</button></form>}</Modal></>;
}
