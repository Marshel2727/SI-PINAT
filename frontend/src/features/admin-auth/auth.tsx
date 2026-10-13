"use client";
import {useEffect,useState,type ReactNode} from "react";
import {useRouter,usePathname} from "next/navigation";
import Link from "next/link";
import {api,send,ApiError} from "@/lib/api";
import {Field,Notice,ErrorNotice} from "@/components/ui";
import type {Row} from "@/types/api";
export function Login(){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError(null);
  const form=new FormData(event.currentTarget);
  try{await send("/auth/login",{email:form.get("email"),password:form.get("password")});router.replace("/admin");}
  catch(e){setError(e);}finally{setBusy(false);}
 }
 return <main className="login-background"><article className="card login-card"><span className="badge">PORTAL MANAJEMEN AKADEMIK</span><img className="login-logo" src="/images/e2ec3.png" width="64" height="64" alt="SI-PINAT"/><h1>Masuk sebagai Administrator</h1><p>Kelola mata kuliah, instrumen kompetensi, dan versi model fuzzy SI-PINAT.</p><form onSubmit={submit}><Field label="Email administrator"><input type="email" name="email" autoComplete="username" required maxLength={190}/></Field><Field label="Kata sandi"><input type="password" name="password" autoComplete="current-password" required maxLength={512}/></Field><ErrorNotice error={error}/><button className="full" disabled={busy}>{busy?"Memeriksa akun…":"Masuk ke panel admin"}</button></form><p className="small muted">Gunakan akun yang dibuat pengelola. Tidak tersedia akun atau kata sandi bawaan.</p><Link href="/">← Kembali ke portal mahasiswa</Link></article></main>;
}
const links=[["/admin","Dashboard"],["/admin/mata-kuliah","Kelola Mata Kuliah"],["/admin/bank-soal","Bank Soal Kompetensi"],["/admin/model-fuzzy","Konfigurasi Fuzzy"],["/admin/validasi","Skenario Validasi"]];
export function AdminShell({children}:{children:ReactNode}){
 const [user,setUser]=useState<Row|null>(null),[error,setError]=useState<unknown>(null),[busy,setBusy]=useState(false);
 const router=useRouter(),pathname=usePathname();
 useEffect(()=>{api("/auth/me").then(r=>setUser(r.data)).catch(e=>{if(e instanceof ApiError&&e.status===401)router.replace("/admin/login");else setError(e);});},[router]);
 async function logout(){if(busy)return;setBusy(true);try{await send("/auth/logout");router.replace("/admin/login");}catch(e){setError(e);setBusy(false);}}
 return <div className="admin-layout"><aside className="admin-sidebar"><strong>SI-PINAT Admin</strong><small>MODUL EVALUASI</small><nav aria-label="Modul administrasi">{links.map(([url,title])=><Link key={url} href={url} className={pathname===url||url!=="/admin"&&pathname.startsWith(url)?"active":""}>{title}</Link>)}</nav><button className="logout" disabled={busy} onClick={logout}>Keluar</button></aside><main className="admin-main"><div className="admin-topbar"><span>Sistem Rekomendasi › <strong>Panel Administrasi</strong></span><span className="badge">{user?.full_name||"Memeriksa sesi…"}</span></div><ErrorNotice error={error}/>{user?children:!error&&<Notice>Memeriksa sesi administrator…</Notice>}</main></div>;
}
