import { AdminProfile } from "@/features/admin/profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Administrator",
};

export default function Page() {
  return <AdminProfile />;
}
