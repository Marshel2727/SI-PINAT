"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api,send} from "@/lib/api";
import {Field,Notice,ErrorNotice,Modal,Pagination} from "@/components/ui";
import type {Row} from "@/types/api";
type Column={key:string;label:string;type?:string;options?:Row[];min?:number;max?:number;step?:string;nullable?:boolean};
const enumOptions=(values:string[])=>values.map(v=>({id:v,name:v}));
export function ModelList(){
 const [rows,setRows]=useState<Row[]>([]),[page,setPage]=useState(1),[pages,setPages]=useState(1),[error,setError]=useState<unknown>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const router=useRouter();
 useEffect(()=>{setLoading(true);api("/admin/fuzzy-models?page="+page).then(r=>{setRows(r.data);setPages(r.meta?.total_pages||1);}).catch(setError).finally(()=>setLoading(false));},[page]);
 async function create(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError(null);const form=new FormData(event.currentTarget);
  try{const {data}=await send("/admin/fuzzy-models",{version_code:form.get("version_code"),sampling_step:Number(form.get("sampling_step"))});router.push("/admin/model-fuzzy/"+data.id);}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 return <><h1>Versi Model Fuzzy</h1><Notice>Versi mencakup konversi, bobot, variabel, himpunan, dan aturan. Model terpublikasi dikunci; perubahan dilakukan melalui kloning.</Notice><button onClick={()=>setOpen(true)}>+ Buat model DRAFT</button><ErrorNotice error={error}/>{loading&&<Notice>Memuat model…</Notice>}<article className="card section">{!loading&&!rows.length?<Notice>Belum ada model. Buat draft dan lengkapi instrumennya.</Notice>:<div className="table-scroll"><table><thead><tr><th>Versi</th><th>Metode</th><th>Sampling</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.version_code}</td><td>{r.method} / {r.defuzzification}</td><td>{r.sampling_step}</td><td><span className="badge">{r.status}</span></td><td><Link href={"/admin/model-fuzzy/"+r.id}>Konfigurasi →</Link></td></tr>)}</tbody></table></div>}<Pagination page={page} total={pages} onChange={setPage}/></article><Modal open={open} title="Buat model draft" onClose={()=>!busy&&setOpen(false)}><form onSubmit={create}><Field label="Kode versi"><input name="version_code" required maxLength={32} pattern="[A-Za-z0-9_-]+"/></Field><Field label="Sampling step (0,01–1)"><input name="sampling_step" type="number" min="0.01" max="1" step="0.01" defaultValue="0.1" required/></Field><ErrorNotice error={error}/><button disabled={busy}>Buat draft</button></form></Modal></>;
}
export function ConfigTable({title,columns,values,locked,onSave,busy}:{title:string;columns:Column[];values:Row[];locked:boolean;onSave:(values:Row[])=>Promise<void>;busy:boolean}){
 const [local,setLocal]=useState<Row[]>(values);
 useEffect(()=>setLocal(values),[values]);
 function update(index:number,key:string,value:unknown){setLocal(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r));}
 function addRow(){const row:Row={};for(const c of columns)row[c.key]=c.type==="boolean"?false:c.nullable?null:c.options?.[0]?.id??(c.type==="number"?c.min??0:"");setLocal([...local,row]);}
 function payload(){return local.map(r=>Object.fromEntries(columns.map(c=>[c.key,c.type==="number"?(c.nullable&&(r[c.key]===""||r[c.key]===null)?null:Number(r[c.key])):c.options&&["course_id","specialization_id","variable_id","academic_set_id","competency_set_id","output_set_id"].includes(c.key)?Number(r[c.key]):r[c.key]]).concat(r.id?[["id",Number(r.id)]]:[])));}
 return <article className="card section"><h2>{title}</h2><form onSubmit={e=>{e.preventDefault();onSave(payload());}}><fieldset disabled={locked||busy}><div className="table-scroll"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}<th>Aksi</th></tr></thead><tbody>{local.map((r,i)=><tr key={r.id||"new-"+i}>{columns.map(c=><td key={c.key}>{c.type==="boolean"?<input aria-label={c.label+" baris "+(i+1)} type="checkbox" checked={!!r[c.key]} onChange={e=>update(i,c.key,e.target.checked)}/>:c.options?<select aria-label={c.label+" baris "+(i+1)} value={r[c.key]??""} required onChange={e=>update(i,c.key,e.target.value)}>{c.options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>:<input aria-label={c.label+" baris "+(i+1)} type={c.type||"text"} value={r[c.key]??""} min={c.min} max={c.max} step={c.step||"any"} required={!c.nullable} onChange={e=>update(i,c.key,e.target.value)}/>}</td>)}<td><button type="button" className="secondary compact" disabled={!!r.id&&columns.some(c=>c.key==="variable_id"||c.key==="direction")} onClick={()=>setLocal(local.filter((_,index)=>index!==i))}>Hapus baris</button></td></tr>)}</tbody></table></div>{!local.length&&<p>Konfigurasi belum diisi.</p>}<div className="actions"><button type="button" className="secondary" onClick={addRow}>+ Baris</button><button disabled={busy}>{busy?"Menyimpan…":"Simpan "+title.toLowerCase()}</button></div></fieldset></form></article>;
}
export function ModelEditor({id}:{id:string}){
 const [model,setModel]=useState<Row|null>(null),[courses,setCourses]=useState<Row[]>([]),[specs,setSpecs]=useState<Row[]>([]),[tab,setTab]=useState("grade-conversions");
 const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[message,setMessage]=useState(""),[cloneOpen,setCloneOpen]=useState(false),[confirmed,setConfirmed]=useState(false);
 const router=useRouter(),base="/admin/fuzzy-models/"+id;
 useEffect(()=>{api(base).then(r=>setModel(r.data)).catch(setError);api("/admin/courses?page_size=100").then(r=>setCourses(r.data.map((c:Row)=>({...c,name:c.code+" · "+c.name})))).catch(setError);api("/specializations").then(r=>setSpecs(r.data)).catch(setError);},[base]);
 async function save(section:string,values:Row[]){
  if(busy)return;setBusy(true);setError(null);setMessage("");
  try{const key=section==="course-weights"?"course_weights":section==="grade-conversions"?"grade_conversions":section;const payload=values.map(v=>{const copy={...v};if(!["sets","variables"].includes(section))delete copy.id;return copy;});const {data}=await send(base+"/"+section,payload,"PUT");setModel(data);setMessage("Konfigurasi tersimpan. Jalankan ulang seluruh skenario validasi.");}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 async function action(kind:string){
  if(busy)return;setBusy(true);setError(null);setMessage("");
  try{const {data}=await send(base+"/"+kind,kind==="publish"?{academic_review_confirmed:confirmed}:undefined);setMessage(kind==="validate"?data.filter((v:Row)=>v.passed).length+" / "+data.length+" skenario lulus.":"Model berhasil dipublikasikan.");setModel((await api(base)).data);}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 async function clone(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError(null);const form=new FormData(event.currentTarget);
  try{const {data}=await send(base+"/clone",{version_code:form.get("version_code"),sampling_step:model?.sampling_step||0.1});router.push("/admin/model-fuzzy/"+data.id);setCloneOpen(false);}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 const locked=model?.status!=="DRAFT",vars=model?.variables||[],sets=model?.sets||[];
 const setOptions=(role:string)=>sets.filter((s:Row)=>s.variable_id===vars.find((v:Row)=>v.code===role)?.id).map((s:Row)=>({id:s.id,name:s.code}));
 const columns:Record<string,Column[]>={
  "grade-conversions":[{key:"letter_grade",label:"Nilai huruf"},{key:"grade_points",label:"Nilai mutu",type:"number",min:0,max:4},{key:"normalized_score",label:"Normalisasi",type:"number",min:0,max:100}],
  "course-weights":[{key:"course_id",label:"Mata kuliah",options:courses},{key:"specialization_id",label:"Peminatan",options:specs},{key:"weight",label:"Bobot relevansi",type:"number",min:0,max:1},{key:"is_required",label:"Wajib",type:"boolean"}],
  variables:[{key:"code",label:"Variabel",options:enumOptions(["ACADEMIC","COMPETENCY","SUITABILITY"])},{key:"direction",label:"Arah",options:enumOptions(["INPUT","OUTPUT"])},{key:"domain_min",label:"Batas bawah",type:"number",min:0,max:100},{key:"domain_max",label:"Batas atas",type:"number",min:0,max:100}],
  sets:[{key:"variable_id",label:"Variabel",options:vars.map((v:Row)=>({id:v.id,name:v.code}))},{key:"code",label:"Himpunan",options:enumOptions(["LOW","MEDIUM","HIGH"])},{key:"shape",label:"Bentuk",options:enumOptions(["TRIANGLE","TRAPEZOID"])},...["a","b","c","d"].map((p):Column=>({key:"point_"+p,label:p.toUpperCase(),type:"number",min:0,max:100,nullable:p==="d"}))],
  rules:[{key:"specialization_id",label:"Peminatan",options:specs},{key:"rule_code",label:"Kode aturan"},{key:"academic_set_id",label:"Akademik",options:setOptions("ACADEMIC")},{key:"competency_set_id",label:"Kompetensi",options:setOptions("COMPETENCY")},{key:"output_set_id",label:"Kesesuaian",options:setOptions("SUITABILITY")},{key:"operator",label:"Operator",options:enumOptions(["AND","OR"])},{key:"rule_weight",label:"Bobot",type:"number",min:0,max:1}]
 };
 const labels:Record<string,string>={"grade-conversions":"Konversi Nilai","course-weights":"Bobot Mata Kuliah",variables:"Variabel",sets:"Himpunan Fuzzy",rules:"Basis Aturan"};
 return <><Link href="/admin/model-fuzzy">← Daftar model</Link><h1>Konfigurasi {model?.version_code||"Model Fuzzy"}</h1><ErrorNotice error={error}/>{message&&<Notice tone="success">{message}</Notice>}{!model&&!error&&<Notice>Memuat konfigurasi…</Notice>}{model&&<><div className="spread wrap"><span className="badge">{model.status} · MAMDANI / CENTROID</span><div className="actions"><button className="secondary" onClick={()=>setCloneOpen(true)}>Kloning ke DRAFT</button><Link className="button secondary" href={"/admin/validasi?model="+id}>Kelola skenario</Link></div></div>{locked&&<Notice>Versi ini terkunci. Kloning untuk membuat perubahan.</Notice>}{model.version_code.toUpperCase().startsWith("DEMO")&&<Notice>Model contoh teknis. Publikasi secara eksplisit hanya mengaktifkan DEMO; FULL memerlukan model akademik yang disetujui.</Notice>}<div className="tabs wrap section">{Object.entries(labels).map(([key,label])=><button key={key} className={tab===key?"":"secondary"} onClick={()=>setTab(key)}>{label}</button>)}</div><ConfigTable key={tab+"-"+id} title={labels[tab]} columns={columns[tab]} values={model[tab.replaceAll("-","_")]||[]} locked={locked} onSave={values=>save(tab,values)} busy={busy}/>{!locked&&<article className="card section"><h2>Validasi dan publikasi</h2><p>Lengkapi seluruh konfigurasi, sepuluh skenario batas/overlap per peminatan, serta bank soal. Semua skenario harus lulus.</p><button disabled={busy} onClick={()=>action("validate")}>Jalankan seluruh skenario</button><label className="checkbox section"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Saya sudah meninjau sumber data, parameter, aturan, soal, dan rentang ekspektasi untuk tujuan penggunaan model ini.</label><button disabled={busy||!confirmed} onClick={()=>action("publish")}>Publikasikan versi model</button></article>}</>}<Modal open={cloneOpen} title="Kloning versi model" onClose={()=>!busy&&setCloneOpen(false)}><form onSubmit={clone}><Field label="Kode versi baru"><input name="version_code" required maxLength={32} pattern="[A-Za-z0-9_-]+"/></Field><ErrorNotice error={error}/><button disabled={busy}>Buat draft hasil kloning</button></form></Modal></>;
}
