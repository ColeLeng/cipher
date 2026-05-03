import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cipher",
  description: "Privacy middleware for AEO and SEO consultants."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
