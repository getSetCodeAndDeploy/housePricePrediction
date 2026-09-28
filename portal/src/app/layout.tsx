import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ServiceStatus from "@/components/ServiceStatus";

export const metadata: Metadata = {
  title: { default: "Housing Portal", template: "%s | Housing Portal" },
  description: "Property value estimation and market analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="sr-only rounded bg-surface p-2 focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50">
          Skip to content
        </a>
        <NavBar />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <ServiceStatus />
          </div>
        </footer>
      </body>
    </html>
  );
}
