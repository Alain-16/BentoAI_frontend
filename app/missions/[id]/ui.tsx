/**
 * The small pieces every zone of the workspace uses.
 *
 * They live together because each is a few lines and they are only ever used
 * here. When a second screen needs one, that is the moment to move it up into a
 * shared folder - not before.
 */

import type { ReactNode } from "react";

/** A sand block standing in for something still being fetched.
 *  Shaped like the thing it is waiting for, so the page reads as "a card is
 *  coming" rather than "nothing is happening". */
export function Skeleton({
  width = "100%",
  height = 14,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`shimmer rounded-[3px] ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}

/** The bordered pill used for constraints, reasons and basket lines. */
export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "clay" | "olive";
}) {
  const tones = {
    default: "border-line bg-paper text-ink",
    clay: "border-clay/40 bg-clay/5 text-clay",
    olive: "border-olive/40 bg-olive/5 text-olive",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-[5px] text-[12px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A small uppercase label - PLAN, BASKET, CHOSEN.
 *  The brief bans these above every heading; used sparingly as a zone marker
 *  they earn their place, which is the distinction it is drawing. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted">
      {children}
    </span>
  );
}

/**
 * A control the design calls for and the backend cannot serve yet.
 *
 * Rendered, not hidden. The layout was designed around these, and an absent
 * button tells the user the product is smaller than it is - while a disabled
 * one with a reason tells the truth. Hovering says why.
 */
export function NotYet({
  children,
  reason,
  className = "",
}: {
  children: ReactNode;
  reason: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled
      title={reason}
      className={`cursor-not-allowed rounded-md border border-line px-3 py-[7px] text-[12.5px] font-medium text-muted/60 ${className}`}
    >
      {children}
    </button>
  );
}
