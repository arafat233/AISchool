"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="text-muted-foreground max-w-sm">The page you were looking for doesn&apos;t exist or has been moved.</p>
      <Link href="/dashboard" className="btn-primary mt-2">Back to dashboard</Link>
    </div>
  );
}
