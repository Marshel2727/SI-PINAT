"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {useAssessment} from "@/features/assessments/context";
import {api,send} from "@/lib/api";
import {number} from "@/lib/format";
import {Field,Notice,ErrorNotice,Modal} from "@/components/ui";
import type {Row} from "@/types/api";
export function Grades(){
 const {assessment,base,reload}=useAssessment(),router=useRouter();
 const [master,setMaster]=useState<Row|null>(null),[values,setValues]=useState<Record<string,string>>({});
 const [state,setState]=useState<Row|null>(null),[error,setError]=useState<unknown>(null),[message,setMessage]=useState("");
 const [tab,setTab]=useState("import"),[semester,setSemester]=useState(""),[busy,setBusy]=useState(false);
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<Row|null>(null);
 const locked=["IN_PROGRESS","COMPLETED"].includes(assessment.status);
 useEffect(()=>{let active=true;Promise.all([api(base+"/courses"),api(base+"/grades")]).then(([a,b])=>{if(!active)return;setMaster(a.data);setState(b.data);setValues(Object.fromEntries(b.data.grades.map((g:Row)=>[g.course_id,g.letter_grade])));}).catch(setError);return()=>{active=false;};},[base]);
 async function manual(){
  if(!master||busy)return;setBusy(true);setError(null);setMessage("");
  try{
   const grades=master.courses.filter((c:Row)=>values[c.id]).map((c:Row)=>({semester:c.semester,kode_mk:c.code,nama_mk:c.name,nilai_huruf:values[c.id]}));
   const {data}=await send(base+"/grades",{grades},"PUT");setState(data);await reload();setMessage(data.ready?"Nilai lengkap dan siap untuk tes.":"Draf tersimpan. Lengkapi mata kuliah wajib.");
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 async function upload(confirm=false){
  if(!file||busy)return;setBusy(true);setError(null);
  try{
   const body=new FormData();body.set("file",file);body.set("confirm",String(confirm));
   const {data}=await api(base+"/grades/import",{method:"POST",body});
   if(!confirm)setPreview(data);else{setPreview(null);setState(data);setValues(Object.fromEntries(data.grades.map((g:Row)=>[g.course_id,g.letter_grade])));await reload();setMessage("Paket nilai impor tersimpan.");}
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 async function next(){
  if(busy)return;setBusy(true);setError(null);
  try{await send(base+"/test/start");router.push("/asesmen/"+assessment.public_id+"/tes");}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 return <><span className="eyebrow">TAHAP 2 DARI 4</span><h1>Input Nilai Akademik</h1><p>Gunakan nilai semester 1–4 sesuai mata kuliah dan konversi pada versi sesi ini.</p><ErrorNotice error={error}/>{message&&<Notice tone="success">{message}</Notice>}{locked&&<Notice>Nilai terkunci setelah jawaban tes pertama. <Link href={"/asesmen/"+assessment.public_id+"/tes"}>Lanjutkan tes</Link></Notice>}<div className="spread wrap"><div className="tabs">{[["import","Impor Excel/CSV"],["manual","Input Manual"]].map(([id,title])=><button key={id} className={tab===id?"":"secondary"} onClick={()=>setTab(id)}>{title}</button>)}</div><Field label="Filter semester"><select value={semester} onChange={e=>setSemester(e.target.value)}><option value="">Semua semester</option>{[1,2,3,4].map(n=><option key={n} value={n}>Semester {n}</option>)}</select></Field></div>{!master&&!error&&<Notice>Memuat daftar mata kuliah…</Notice>}{master&&tab==="import"&&<article className="card"><div className="spread wrap"><h2>Impor Utama: Excel (.xlsx) / CSV</h2><div className="actions"><a className="button secondary" href={"/api/v1"+base+"/grades/template?format=csv"}>Template CSV</a><a className="button secondary" href={"/api/v1"+base+"/grades/template?format=xlsx"}>Template XLSX</a></div></div><p>Header: semester, kode_mk, nama_mk, nilai_huruf. Berkas maksimal 10 MB dan 1.000 baris, tanpa formula atau makro.</p><div className="upload-zone"><img src="/images/606c1.svg" alt=""/><Field label="Pilih berkas transkrip"><input type="file" accept=".csv,.xlsx" disabled={locked||busy} onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null);}}/></Field><button disabled={locked||busy||!file} onClick={()=>upload()}>{busy?"Memvalidasi…":"Validasi dan lihat pratinjau"}</button></div></article>}{master&&tab==="manual"&&<article className="card"><h2>Nilai per mata kuliah</h2>{master.courses.length===0?<Notice>Belum ada mata kuliah yang berlaku pada semester ini.</Notice>:<div className="table-scroll"><table><thead><tr><th>Semester</th><th>Kode MK</th><th>Mata kuliah</th><th>SKS</th><th>Nilai huruf</th><th>Skor normalisasi</th></tr></thead><tbody>{master.courses.filter((c:Row)=>!semester||String(c.semester)===semester).map((c:Row)=><tr key={c.id}><td>{c.semester}</td><td className="mono">{c.code}</td><td>{c.name}</td><td>{c.credits}</td><td><select aria-label={"Nilai "+c.name} value={values[c.id]||""} disabled={locked||busy} onChange={e=>{setValues({...values,[c.id]:e.target.value});setState(null);}}><option value="">Belum diisi</option>{master.conversions.map((g:Row)=><option value={g.letter_grade} key={g.id}>{g.letter_grade}</option>)}</select></td><td>{values[c.id]?number(master.conversions.find((g:Row)=>g.letter_grade===values[c.id])?.normalized_score||0):"—"}</td></tr>)}</tbody></table></div>}<button disabled={locked||busy} onClick={manual}>{busy?"Menyimpan…":"Simpan nilai manual"}</button></article>}{master&&<article className="notice"><h3>Konversi pada model {assessment.model_version}</h3><div className="actions">{master.conversions.map((g:Row)=><span className="badge" key={g.id}>{g.letter_grade} = {number(g.grade_points)} / {number(g.normalized_score)}</span>)}</div></article>}{state&&<article className="card"><h2>Kelengkapan akademik</h2><p>{state.coverage?.provided||0} / {state.coverage?.available||0} mata kuliah terisi.</p>{state.missing_required?.length>0&&<Notice tone="error">Nilai wajib belum lengkap: {state.missing_required.join(", ")}</Notice>}{state.errors?.map((e:string)=><p key={e}>{e}</p>)}<div className="metrics">{Object.entries(state.academic_scores||{}).map(([key,value])=><div key={key}><strong>{number(Number(value))}</strong><small>{key}</small></div>)}</div></article>}<div className="spread wrap section"><Link className="button secondary" href={"/asesmen/"+assessment.public_id+"/peminatan"}>← Peminatan awal</Link><button disabled={busy||!state?.ready} onClick={next}>{busy?"Menyiapkan tes…":"Lanjut ke tes kompetensi →"}</button></div><Modal open={!!preview} title="Pratinjau impor nilai" onClose={()=>!busy&&setPreview(null)}><Notice>Konfirmasi akan mengganti seluruh paket nilai sesi ini. Nilai lama tetap tersimpan bila impor gagal.</Notice><div className="table-scroll"><table><thead><tr><th>Kode</th><th>Mata kuliah</th><th>Nilai</th></tr></thead><tbody>{preview?.preview.map((r:Row,i:number)=><tr key={i}><td>{r.kode_mk}</td><td>{r.nama_mk}</td><td>{r.nilai_huruf}</td></tr>)}</tbody></table></div><button disabled={busy} onClick={()=>upload(true)}>{busy?"Menyimpan…":"Konfirmasi dan simpan paket"}</button></Modal></>;
}
