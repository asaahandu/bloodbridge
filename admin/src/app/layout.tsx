import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BloodBridge Admin",
  description: "Operations dashboard for the BloodBridge network.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
