import type { Metadata } from "next";
import {Header,Footer} from "@/components/header";
import "./globals.css";
export const metadata:Metadata={title:{default:"SI-PINAT | Temukan Peminatanmu",template:"%s | SI-PINAT"},description:"Rekomendasi peminatan Teknik Komputer melalui nilai akademik dan tes kompetensi dengan Fuzzy Mamdani."};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="id"><body><Header/>{children}<Footer/></body></html>;
}
