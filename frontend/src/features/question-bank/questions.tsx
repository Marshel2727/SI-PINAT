"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api,send} from "@/lib/api";
import {Field,Notice,ErrorNotice,Pagination} from "@/components/ui";
import {names} from "@/lib/format";
import type {Row} from "@/types/api";
export function Questions(){
 const [rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState(""),[page,setPage]=useState(1),[pages,setPages]=useState(1),[error,setError]=useState<unknown>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);api("/admin/questions?page="+page+(status?"&status="+status:"")).then(r=>{if(!active)return;setRows(r.data);setPages(r.meta?.total_pages||1);setError(null);}).catch(e=>active&&setError(e)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[status,page]);
 return <><h1>Bank Soal Kompetensi</h1><div className="spread"><Field label="Status"><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Semua status</option>{["DRAFT","PUBLISHED","ARCHIVED"].map(s=><option key={s}>{s}</option>)}</select></Field><Link className="button" href="/admin/bank-soal/baru">+ Tambah soal</Link></div><ErrorNotice error={error}/>{loading&&<Notice>Memuat bank soal…</Notice>}<article className="card">{!loading&&!rows.length?<Notice>Bank soal masih kosong.</Notice>:<div className="table-scroll"><table><thead><tr><th>Kode / revisi</th><th>Soal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="mono">{r.code} · r{r.revision}</td><td>{r.prompt}</td><td><span className="badge">{r.status}</span></td><td><Link href={"/admin/bank-soal/"+r.id}>Buka soal →</Link></td></tr>)}</tbody></table></div>}<Pagination page={page} total={pages} onChange={setPage}/></article></>;
}
export function QuestionEditor({id}:{id:string}){
 const [question,setQuestion]=useState<Row|null>(id==="baru"?{status:"DRAFT",options:["A","B","C","D"].map(label=>({label,option_text:"",is_correct:label==="A"}))}:null);
 const [specs,setSpecs]=useState<Row[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[message,setMessage]=useState("");
 const router=useRouter();
 useEffect(()=>{api("/specializations").then(r=>setSpecs(r.data)).catch(setError);if(id!=="baru")api("/admin/questions/"+id).then(r=>setQuestion(r.data)).catch(setError);},[id]);
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!question)return;setBusy(true);setError(null);
  const form=new FormData(event.currentTarget);
  const body={code:form.get("code"),prompt:form.get("prompt"),explanation:form.get("explanation")||null,specialization_id:Number(form.get("specialization_id")),options:question.options.map((o:Row)=>({label:o.label,option_text:o.option_text,is_correct:o.is_correct}))};
  try{const {data}=await send("/admin/questions"+(id==="baru"?"":"/"+id),body,id==="baru"?"POST":"PATCH");setQuestion(data);setMessage("Draf soal tersimpan.");if(id==="baru")router.replace("/admin/bank-soal/"+data.id);}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 async function action(kind:string){
  if(busy)return;setBusy(true);setError(null);
  try{const {data}=await send("/admin/questions/"+id+"/"+kind);if(kind==="revisions")router.push("/admin/bank-soal/"+data.id);else setQuestion(data);setMessage("Status soal diperbarui.");}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 const locked=question?.status!=="DRAFT";
 return <><Link href="/admin/bank-soal">← Bank soal</Link><h1>{id==="baru"?"Tambah soal":"Detail dan revisi soal"}</h1><ErrorNotice error={error}/>{message&&<Notice tone="success">{message}</Notice>}{question?<article className="card"><span className="badge">{question.status}</span><form onSubmit={save} key={question.id||"new"}><fieldset disabled={busy||locked}><div className="two-columns"><Field label="Kode soal"><input name="code" defaultValue={question.code} maxLength={32} required readOnly={!!question.id}/></Field><Field label="Peminatan"><select name="specialization_id" defaultValue={question.specialization_id||specs[0]?.id} required>{specs.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field></div><Field label="Pertanyaan"><textarea name="prompt" defaultValue={question.prompt} required rows={4} maxLength={10000}/></Field><h3>Opsi jawaban dan kunci tunggal</h3>{question.options.map((o:Row,index:number)=><div className="option-editor" key={o.label}><label className="checkbox"><input type="radio" name="correct" checked={o.is_correct} onChange={()=>setQuestion({...question,options:question.options.map((v:Row,i:number)=>({...v,is_correct:i===index}))})}/>Kunci {o.label}</label><input aria-label={"Opsi "+o.label} value={o.option_text} required maxLength={5000} onChange={e=>setQuestion({...question,options:question.options.map((v:Row,i:number)=>i===index?{...v,option_text:e.target.value}:v)})}/></div>)}<Field label="Penjelasan kunci (admin)"><textarea name="explanation" defaultValue={question.explanation} rows={3}/></Field>{!locked&&<button disabled={busy}>{busy?"Menyimpan…":"Simpan draf"}</button>}</fieldset></form>{id!=="baru"&&<div className="actions section">{question.status==="DRAFT"&&<button disabled={busy} onClick={()=>action("publish")}>Publikasikan soal</button>}<button className="secondary" disabled={busy} onClick={()=>action("revisions")}>Buat revisi baru</button>{question.status!=="ARCHIVED"&&<button className="secondary" disabled={busy} onClick={()=>action("archive")}>Arsipkan</button>}</div>}{locked&&<Notice>Revisi ini terkunci. Buat revisi baru untuk mengubah soal atau opsi.</Notice>}</article>:<Notice>Memuat soal…</Notice>}</>;
}
