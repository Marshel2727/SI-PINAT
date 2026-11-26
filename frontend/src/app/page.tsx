import { HomePortal } from "@/features/assessments/home-portal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda",
};

export default function Home() {
  return <HomePortal />;
}
