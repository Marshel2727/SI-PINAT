import {Validation} from "@/features/fuzzy-models/validation";
export default async function Page({searchParams}:{searchParams:Promise<{model?:string}>}){const {model}=await searchParams;return <Validation initialModel={model}/>;}
