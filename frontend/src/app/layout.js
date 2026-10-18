import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalToast from "../components/GlobalToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ma Stall | Private Ledger",
  description: "Private financial records for Ma Stall — daily investment, income, cash and profit or loss.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <GlobalToast />
      </body>
    </html>
  );
}
