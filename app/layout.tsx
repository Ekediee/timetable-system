import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";
import App from "@/App";

export const metadata: Metadata = {
  title: "BU Pulse",
  description: "Departmental Timetabling Tool — Babcock University",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <App>{children}</App>
        </AppProvider>
      </body>
    </html>
  );
}
