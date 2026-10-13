import {AssessmentProvider} from "@/features/assessments/context";
export default function Layout({children}:{children:React.ReactNode}){return <AssessmentProvider>{children}</AssessmentProvider>;}
