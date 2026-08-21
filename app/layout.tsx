import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import NavBar from "./NavBar";

export const metadata = {
  title: "ENT 응급콜 관리",
  description: "이비인후과 전공의 응급실 노티 및 역량 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <NavBar />
          <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
