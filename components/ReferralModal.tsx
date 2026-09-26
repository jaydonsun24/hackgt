"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PatientCriteria, RankedTrial } from "@/lib/contracts";
import { checkLabel, sexLabel } from "@/lib/format";

function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = () => {
      if (canvas.dataset.ready === "1") return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.lineWidth = 2.4 * ratio;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1c2b33";
      canvas.dataset.ready = "1";
    };
    setup();
    const observer = new ResizeObserver(setup);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const next = point(event);
    ctx.beginPath();
    ctx.moveTo(next.x, next.y);
    ctx.lineTo(next.x + 0.01, next.y + 0.01);
    ctx.stroke();
    setHasInk(true);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const next = point(event);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  }

  function end(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  return (
    <div className="mt-6">
      <p className="text-sm font-medium">Signature</p>
      <div className="relative mt-2 overflow-hidden rounded-xl border border-ink bg-paper">
        <canvas
          ref={canvasRef}
          aria-label="Draw your signature"
          className="h-36 w-full cursor-crosshair touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        {hasInk ? null : (
          <span className="no-print pointer-events-none absolute left-4 top-4 text-sm text-muted">Sign here</span>
        )}
      </div>
      <button type="button" onClick={clear} className="no-print mt-2 text-sm text-teal">
        Clear signature
      </button>
    </div>
  );
}

export function ReferralModal({
  ranked,
  criteria,
  onClose,
}: {
  ranked: RankedTrial;
  criteria: PatientCriteria;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [clinician, setClinician] = useState("");
  const site = ranked.trial.nearestSite;
  const demo = ranked.trial.url.startsWith("#");
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    const root = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    function items() {
      return Array.from(
        root?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea") ?? [],
      ).filter((item) => !item.hasAttribute("disabled"));
    }
    items()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button type="button" className="no-print absolute inset-0 bg-ink/40" aria-label="Close referral packet" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="print-target relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-card"
      >
        <div className="no-print flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm text-teal">
            Close
          </button>
        </div>
        <header className="border-b border-line pb-4">
          <p className="text-sm font-medium text-teal">TrialPath referral packet</p>
          <h2 id={titleId} className="mt-1 text-2xl font-semibold text-ink">
            {ranked.trial.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{today}</p>
        </header>
        <section className="mt-4 text-sm leading-relaxed">
          <p>
            <span className="font-medium">Trial ID: </span>
            {demo ? `Demo trial (${ranked.trial.nctId})` : ranked.trial.nctId}
          </p>
          {demo ? <p>Demo trial — not a ClinicalTrials.gov record.</p> : <p>{ranked.trial.url}</p>}
          {site ? (
            <p className="mt-2">
              <span className="font-medium">Nearest site: </span>
              {`${site.facility}, ${site.city}${site.state ? `, ${site.state}` : ""} ${site.zip ?? ""}${site.distanceMiles != null ? ` (${site.distanceMiles} miles)` : ""}`.trim()}
            </p>
          ) : null}
          {site?.contactName || site?.contactPhone || site?.contactEmail ? (
            <p>
              Contact: {[site.contactName, site.contactPhone, site.contactEmail].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </section>
        <section className="mt-5">
          <h3 className="text-base font-semibold">Confirm before referring</h3>
          <ul className="mt-2 space-y-2">
            {ranked.checks.map((check) => (
              <li key={`${check.criterion}-${check.note}`}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-teal" />
                  <span>
                    <span className="font-medium">
                      {checkLabel(check.status)} · {check.criterion}
                    </span>
                    <span className="mt-1 block text-muted">{check.note}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-5">
          <h3 className="text-base font-semibold">Patient facts (de-identified)</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Condition: {criteria.condition || "Not stated"}</li>
            <li>Age: {criteria.age ?? "Not stated"}</li>
            <li>Sex: {sexLabel(criteria.sex) ?? "Not stated"}</li>
            <li>Stage: {criteria.stage ?? "Not stated"}</li>
            <li>Prior treatments: {criteria.priorTreatments.join(", ") || "None stated"}</li>
            <li>Key findings: {criteria.keyFindings.join(", ") || "None stated"}</li>
            <li>Clinic ZIP: {criteria.zip ?? "Not stated"}</li>
          </ul>
          <p className="mt-2 text-sm text-muted">Do not add a name, address, or medical record number.</p>
        </section>
        <section className="mt-6">
          <label htmlFor="clinician" className="text-sm font-medium">
            Clinician name
          </label>
          <input
            id="clinician"
            value={clinician}
            onChange={(event) => setClinician(event.target.value)}
            className="mt-2 w-full border-b border-ink bg-transparent py-2"
          />
          <SignaturePad />
        </section>
        <div className="no-print mt-6">
          <button type="button" onClick={() => window.print()} className="min-h-11 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white">
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
