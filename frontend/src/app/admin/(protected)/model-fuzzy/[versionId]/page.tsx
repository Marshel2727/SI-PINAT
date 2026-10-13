import { ModelEditor } from "@/features/fuzzy-models/model-editor";

export default async function Page({ params }: {
  params: Promise<{
    versionId: string;
  }>;
}) {
  const { versionId } = await params;
  return <ModelEditor id={versionId} />;
}
