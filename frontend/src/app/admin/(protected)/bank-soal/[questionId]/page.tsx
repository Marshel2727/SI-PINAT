import { QuestionEditor } from "@/features/question-bank/question-editor";

export default async function Page({ params }: {
  params: Promise<{
    questionId: string;
  }>;
}) {
  const { questionId } = await params;
  return <QuestionEditor id={questionId} />;
}
