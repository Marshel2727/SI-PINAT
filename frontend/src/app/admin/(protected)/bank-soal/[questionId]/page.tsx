import {QuestionEditor} from "@/features/question-bank/questions";
export default async function Page({params}:{params:Promise<{questionId:string}>}){const {questionId}=await params;return <QuestionEditor id={questionId}/>;}
