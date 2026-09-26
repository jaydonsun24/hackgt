"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ShellContextValue = {
  demo: boolean;
  setDemo: (value: boolean) => void;
  mockBadge: boolean;
  setMockBadge: (value: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("Shell context is missing");
  return value;
}

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8">
      <rect width="32" height="32" rx="8" fill="#0e4d56" />
      <path d="M7 22c4-1.5 6.2-8 8.2-8s3.2 6.2 7.8 4.2" fill="none" stroke="#f4f1ea" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23" cy="11" r="3" fill="#e7c27a" />
    </svg>
  );
}

function Header() {
  const pathname = usePathname();
  const { demo, setDemo, mockBadge } = useShell();
  return (
    <header className="border-b border-line bg-card/90">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3 rounded-md">
          <Mark />
          <span>
            <span className="block text-lg font-semibold tracking-tight text-ink">TrialPath</span>
            <span className="block text-sm text-muted">Clinical trials for every clinic</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {mockBadge ? (
            <span className="rounded-full border border-copper/40 bg-[#f8efe6] px-3 py-1 text-sm font-medium text-copper">
              Demo data
            </span>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-muted" htmlFor="demo-mode">
            <input
              id="demo-mode"
              type="checkbox"
              className="h-4 w-4 accent-teal"
              checked={demo}
              onChange={(event) => setDemo(event.target.checked)}
            />
            Demo mode
          </label>
          <Link
            href="/sponsor"
            aria-current={pathname === "/sponsor" ? "page" : undefined}
            className="rounded-full border border-line px-3 py-2 text-sm font-medium text-teal hover:bg-white"
          >
            Sponsor dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted">
        De-identified input only. Nothing is stored.
      </p>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [demo, setDemoState] = useState(false);
  const [mockBadge, setMockBadgeState] = useState(false);
  const setMockBadge = useCallback((value: boolean) => {
    setMockBadgeState(value);
  }, []);

  useEffect(() => {
    setDemoState(window.localStorage.getItem("trialpath-demo-mode") === "1");
  }, []);

  function setDemo(value: boolean) {
    setDemoState(value);
    window.localStorage.setItem("trialpath-demo-mode", value ? "1" : "0");
  }

  return (
    <ShellContext.Provider value={{ demo, setDemo, mockBadge, setMockBadge }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    </ShellContext.Provider>
  );
}
