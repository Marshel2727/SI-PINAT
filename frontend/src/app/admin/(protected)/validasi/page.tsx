import { Validation } from "@/features/admin/validation";

export default async function Page({ searchParams }: {
  searchParams: Promise<{
    model?: string;
  }>;
}) {
  const { model } = await searchParams;
  return <Validation initialModel={model} />;
}
