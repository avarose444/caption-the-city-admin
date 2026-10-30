import type { Metadata } from "next";
import { Anton, Courier_Prime } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caption the City Admin",
  description: "Superadmin area for Caption the City.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${courierPrime.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
