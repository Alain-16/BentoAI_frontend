"use client";

import { useState } from "react";
import type { ActivityEvent } from "@/lib/api";

/**
 * The trust layer.
 *
 * The brief calls this out as the thing that has to earn belief rather than
 * perform it: specific, verifiable work in plain words. Every line here comes
 * from an audit event the backend actually wrote when a step finished, and the
 * wording was decided there, next to the payload it summarises. Nothing on this
 * list can claim work that did not happen, because there is nowhere for the
 * frontend to invent one.
 *
 * "use client" because it has a hide/show toggle, and state only exists in the
 * browser.
 */
export function ActivityLog({
  events,
  current,
}: {
  events: ActivityEvent[];
  /** What is happening right now, if anything. Derived from mission status. */
  current: string | null;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mt-7 border-t border-line pt-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">Activity</span>
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          className="text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <ol className="mt-3 space-y-2.5">
          {events.map((event) => (
            <li key={event.id} className="flex gap-2.5">
              <span aria-hidden className="mt-[1px] text-[12px] leading-[1.5] text-olive">
                ✓
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] leading-[1.5] text-ink">
                  {event.title}
                </span>
                {event.detail && (
                  <span className="block text-[11.5px] leading-[1.45] text-muted">
                    {event.detail}
                  </span>
                )}
                {/* Notes are what a step wanted the customer to know - a
                    provider that could not be reached, products that vanished
                    from the catalogue. They are the least polished and the most
                    useful thing on the list. */}
                {event.notes.map((note, i) => (
                  <span key={i} className="block text-[11.5px] leading-[1.45] text-muted">
                    {note}
                  </span>
                ))}
              </span>
            </li>
          ))}

          {/* The one line that is not finished yet. A dot rather than a tick,
              and it pulses, so the difference between "done" and "doing" is
              visible without reading. */}
          {current && (
            <li className="flex gap-2.5">
              <span aria-hidden className="mt-[1px] animate-pulse text-[12px] leading-[1.5] text-olive">
                •
              </span>
              <span className="text-[12.5px] leading-[1.5] text-muted">{current}…</span>
            </li>
          )}

          {events.length === 0 && !current && (
            <li className="text-[12px] text-muted">Nothing has happened yet.</li>
          )}
        </ol>
      )}
    </section>
  );
}
