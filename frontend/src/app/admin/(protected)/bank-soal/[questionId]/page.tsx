import { QuestionEditor } from "@/features/admin/question-editor";

export default async function Page({ params }: {
  params: Promise<{
    questionId: string;
  }>;
}) {
  const { questionId } = await params;
  return <QuestionEditor id={questionId} />;
}
