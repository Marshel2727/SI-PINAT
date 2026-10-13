"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {ApiError,prettyError} from "@/lib/api";
import {number} from "@/lib/format";
import type {Score} from "@/types/api";

export function Notice({children,tone="info"}:{children:ReactNode;tone?:"info"|"error"|"success"}) {
 return <div className={"notice "+tone} role={tone==="error"?"alert":"status"}>{children}</div>;
}
function detailMessage(value:unknown):string {
 if(typeof value==="string")return value;
 if(!value||typeof value!=="object")return "Periksa kembali data yang dimasukkan.";
 const row=value as Record<string,any>;
 const parts:string[]=[];
 if(row.row)parts.push("Baris "+row.row+(row.kode_mk?" ("+row.kode_mk+")":""));
 if(row.message)parts.push((row.field?row.field+": ":"")+row.message);
 if(Array.isArray(row.messages))parts.push(...row.messages);
 if(row.missing_required?.length)parts.push("Mata kuliah wajib: "+row.missing_required.join(", "));
 if(Array.isArray(row.errors))parts.push(...row.errors);
 return parts.join(". ")||"Periksa kembali data yang dimasukkan.";
}
export function ErrorNotice({error}:{error:unknown}) {
 if(!error)return null;
 return <Notice tone="error"><strong>{prettyError(error)}</strong>{error instanceof ApiError && error.details.length>0 && <ul>{error.details.map((d,i)=><li key={i}>{detailMessage(d)}</li>)}</ul>}</Notice>;
}
export function Field({label,children}:{label:string;children:ReactNode}) {
 return <label className="field"><span>{label}</span>{children}</label>;
}
export function Steps({active}:{active:number}) {
 return <ol className="steps" aria-label="Tahapan asesmen">{["Peminatan Awal","Nilai Akademik","Tes Kompetensi","Hasil Rekomendasi"].map((text,i)=><li className={i+1===active?"current":i+1<active?"done":""} aria-current={i+1===active?"step":undefined} key={text}><span className="step-number">{i+1<active?"✓":i+1}</span><div><small>Tahap {i+1}</small><strong>{text}</strong></div></li>)}</ol>;
}
export function ScoreBars({scores}:{scores:Score[]}) {
 return <div className="score-bars">{scores.map((score,i)=><div key={score.specialization_code}><div className="spread"><strong>{score.specialization_name}</strong><span className="mono">#{score.rank_position} · {number(score.suitability_score)}</span></div><div className="bar"><div style={{width:score.suitability_score+"%",background:i===0?"var(--primary)":i===1?"var(--navy-secondary)":"var(--teal)"}}/></div></div>)}</div>;
}
export function Modal({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open)ref.current?.showModal();else ref.current?.close();},[open]);
 return <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-label={title}><div className="spread"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup dialog">×</button></div>{children}</dialog>;
}
export function Pagination({page,total,onChange}:{page:number;total:number;onChange:(p:number)=>void}) {
 return <div className="pagination"><button className="secondary" disabled={page<=1} onClick={()=>onChange(page-1)}>Sebelumnya</button><span>Halaman {page} / {Math.max(total,1)}</span><button className="secondary" disabled={page>=total} onClick={()=>onChange(page+1)}>Berikutnya</button></div>;
}
export function Curve({x,y,label}:{x:number[];y:number[];label:string}) {
 const points=x.map((v,i)=>(30+v*5.4)+","+(170-y[i]*140)).join(" ");
 return <svg className="curve" viewBox="0 0 600 205" role="img" aria-label={label}><path d="M30 20V170H575" stroke="#74777F" fill="none"/><polyline points={points} fill="none" stroke="#0051D5" strokeWidth="3"/>{[0,20,40,60,80,100].map(n=><text key={n} x={30+n*5.4} y="192" textAnchor="middle" fontSize="12">{n}</text>)}<text x="8" y="30" fontSize="12">1</text><text x="10" y="174" fontSize="12">0</text></svg>;
}
export function ActionLink({href,children}:{href:string;children:ReactNode}) { return <Link className="button" href={href}>{children}</Link>; }
