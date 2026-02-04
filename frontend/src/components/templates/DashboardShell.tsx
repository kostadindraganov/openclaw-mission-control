"use client";

import type { ReactNode } from "react";

import { SignedIn, UserButton } from "@clerk/nextjs";

import { BrandMark } from "@/components/atoms/BrandMark";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-app text-strong">
      <div
        className="absolute inset-0 bg-landing-grid opacity-[0.18] pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative flex min-h-screen w-full flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] bg-[color:rgba(244,246,250,0.8)] px-6 py-5 backdrop-blur">
          <BrandMark />
          <SignedIn>
            <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 shadow-sm">
              <UserButton />
            </div>
          </SignedIn>
        </header>
        <div className="flex-1 px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
