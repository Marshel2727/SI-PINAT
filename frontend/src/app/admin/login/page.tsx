import { Login } from "@/features/admin/login";

export default async function Page({ searchParams }: {
  searchParams: Promise<{
    next?: string;
    expired?: string;
  }>;
}) {
  const { next, expired } = await searchParams;
  return <Login nextPath={next} expired={expired === "1"} />;
}
