import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "조선소 도장 품질관리",
  description: "Coating QM System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
