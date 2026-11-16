import { AdminAssessment } from "@/features/admin/assessment";

export default async function Page({ params }: {
  params: Promise<{
    publicId: string;
  }>;
}) {
  const { publicId } = await params;
  return <AdminAssessment id={publicId} />;
}
