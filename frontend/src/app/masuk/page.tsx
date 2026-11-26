import { StudentLogin } from "@/features/student-auth/login";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk Mahasiswa TEKOM",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <StudentLogin nextPath={next} />;
}
