import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { validateEnv } from "@/lib/env";

// Fail fast on missing environment variables — surfaces misconfiguration
// immediately rather than deep in a request handler.
validateEnv();

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LoanFlow AI — Virtual Loan Processor",
  description: "AI-powered loan processing for independent mortgage loan officers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
