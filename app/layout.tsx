import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CS 답변서랍 — 셀러의 답변 작업공간",
  description: "스토어별 고객 문의 답변을 저장하고, 필요한 만큼 수정해 바로 복사하세요.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
