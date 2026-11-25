import { AmbientBackground } from "@/components/ambient-background";
import { Footer, Header } from "@/components/header";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SI-PINAT | Tentukan Peminatan Teknik Komputer",
    template: "%s | SI-PINAT",
  },
  description: "Rekomendasi peminatan Teknik Komputer melalui nilai akademik dan tes kompetensi dengan Fuzzy Mamdani.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <a href="#main-content" className="skip-link visually-hidden">
          Lewati ke konten utama
        </a>
        <AmbientBackground />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
