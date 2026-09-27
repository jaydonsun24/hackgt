"use client";

import { animate, svg, utils } from "animejs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { reducedMotion } from "@/lib/motion";

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
  const pathRef = useRef<SVGPathElement>(null);
  const sunRef = useRef<SVGCircleElement>(null);

  useLayoutEffect(() => {
    const path = pathRef.current;
    const sun = sunRef.current;
    if (!path || !sun || reducedMotion()) return;
    utils.set([path, sun], { opacity: 1 });
    const drawn = animate(svg.createDrawable(path), { draw: ["0 0", "0 1"], duration: 1200, delay: 150, ease: "inOutQuad" });
    const rise = animate(sun, { scale: [0, 1], duration: 900, delay: 900, ease: "outBack(2)" });
    return () => {
      drawn.revert();
      rise.revert();
    };
  }, []);

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7 shrink-0">
      <rect width="32" height="32" rx="6" fill="#f4f1ea" />
      <path
        ref={pathRef}
        data-reveal=""
        d="M7 22c4-1.5 6.2-8 8.2-8s3.2 6.2 7.8 4.2"
        fill="none"
        stroke="#0e4d56"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle ref={sunRef} data-reveal="" cx="23" cy="11" r="3" fill="#c9962f" style={{ transformOrigin: "center", transformBox: "fill-box" }} />
    </svg>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-full items-center border-b-4 px-1 pt-1 text-[15px] ${
        active ? "border-gold font-semibold text-white" : "border-transparent text-white/80 hover:text-white hover:underline"
      }`}
    >
      {children}
    </Link>
  );
}

function Header() {
  const { demo, setDemo, mockBadge } = useShell();
  return (
    <header className="bg-teal text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-stretch justify-between gap-x-6 px-4">
        <Link href="/" className="flex items-center gap-2.5 py-3">
          <Mark />
          <span className="text-lg font-semibold tracking-tight">Refera</span>
        </Link>
        <div className="flex flex-wrap items-stretch gap-x-6">
          <nav aria-label="Main" className="flex items-stretch gap-5">
            <NavLink href="/">Find trials</NavLink>
            <NavLink href="/sponsor">Sponsor dashboard</NavLink>
          </nav>
          <div className="flex items-center gap-4 py-3">
            {mockBadge ? (
              <span className="rounded bg-gold px-2 py-0.5 text-xs font-semibold text-ink">Demo data</span>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/90" htmlFor="demo-mode">
              <input
                id="demo-mode"
                type="checkbox"
                className="h-4 w-4 accent-gold"
                checked={demo}
                onChange={(event) => setDemo(event.target.checked)}
              />
              Demo mode
            </label>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-muted sm:flex-row sm:justify-between">
        <p>De-identified input only. Nothing is stored.</p>
        <p>Trials from ClinicalTrials.gov. Vulnerability from the CDC/ATSDR SVI 2022.</p>
      </div>
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
    setDemoState(window.localStorage.getItem("refera-demo-mode") === "1");
  }, []);

  function setDemo(value: boolean) {
    setDemoState(value);
    window.localStorage.setItem("refera-demo-mode", value ? "1" : "0");
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
