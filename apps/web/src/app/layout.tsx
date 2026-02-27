import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "BookedKit Radar",
  description: "EPK lead discovery dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight">BookedKit Radar</span>
              </Link>
              <div className="flex gap-4 text-sm">
                <Link
                  href="/"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Inbox
                </Link>
                <Link
                  href="/archived"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Archived
                </Link>
                <Link
                  href="/sources"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sources
                </Link>
              </div>
            </div>
          </nav>
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
