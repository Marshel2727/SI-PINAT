import {AdminAssessment} from "@/features/admin-dashboard/assessment";
export default async function Page({params}:{params:Promise<{publicId:string}>}){const {publicId}=await params;return <AdminAssessment id={publicId}/>;}
