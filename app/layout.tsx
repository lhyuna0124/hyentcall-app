import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import NavBar from "./NavBar";
import StaffBoardSidebar from "./StaffBoardSidebar";
import QuickActionsWidget from "./QuickActionsWidget";

export const metadata = {
  title: "HY-ENT Workspace",
  description: "이비인후과 전공의 응급실 노티 및 역량 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <NavBar />
          <StaffBoardSidebar />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
          <QuickActionsWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
