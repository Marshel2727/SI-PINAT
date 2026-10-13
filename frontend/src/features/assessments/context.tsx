"use client";
import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from "react";
import {useParams,usePathname} from "next/navigation";
import {api} from "@/lib/api";
import type {Assessment} from "@/types/api";
import {ErrorNotice,Steps,Notice} from "@/components/ui";
import Link from "next/link";
type State={assessment:Assessment;reload:()=>Promise<void>;base:string};
const Context=createContext<State|null>(null);
export const useAssessment=()=>{const value=useContext(Context);if(!value)throw new Error("Assessment provider required");return value;};
export function AssessmentProvider({children}:{children:ReactNode}){
 const {publicId}=useParams<{publicId:string}>(),path=usePathname();
 const [assessment,setAssessment]=useState<Assessment|null>(null),[error,setError]=useState<unknown>(null);
 const base="/assessments/"+publicId;
 const reload=useCallback(async()=>{const value=await api<Assessment>(base);setAssessment(value.data);setError(null);},[base]);
 useEffect(()=>{reload().catch(setError);},[reload,path]);
 const stage=path.endsWith("/peminatan")?1:path.endsWith("/nilai")?2:path.endsWith("/tes")?3:4;
 return <main className="container section"><Steps active={stage}/><ErrorNotice error={error}/>{!assessment&&!error&&<Notice>Memuat sesi asesmen…</Notice>}{assessment&&<Context.Provider value={{assessment,reload,base}}><div className="session-meta"><span className={"badge "+(assessment.mode==="DEMO"?"demo":"")}>{assessment.mode==="DEMO"?"DEMO · DATA CONTOH":"ASESMEN FULL"}</span><small>Model {assessment.model_version}</small></div>{assessment.status==="COMPLETED"&&stage<4?<Notice>Asesmen sudah selesai dan input terkunci. <Link href={"/asesmen/"+publicId+"/hasil"}>Buka hasil</Link></Notice>:children}</Context.Provider>}</main>;
}
