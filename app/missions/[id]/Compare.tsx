"use client";

import { useEffect, useState } from "react";
import type { BasketOption, BasketRequirement, Mission } from "@/lib/api";
import { amount, money } from "@/lib/api";


/**
 * Two or three products side by side.
 *
 * An overlay rather than its own page, on purpose: the budget meter and the
 * basket stay visible behind it, and the whole decision is about money. Sending
 * someone to another route would hide the number they are deciding against.
 *
 * The brief has one hard rule here - "never an invented composite score". So
 * the overall score each product has is not shown anywhere. What is shown is
 * its parts, which is the opposite of a composite: the four things the scoring
 * engine actually measured, each labelled with what it really means.
 */
export function Compare({
  mission,
  group,
  basket,
  onClose,
  onSelect,
}: {
  mission: Mission;
  group: BasketRequirement;
  basket: { total: string; remaining: string | null; currency: string };
  onClose: () => void;
  /** Chooses a product for this requirement, then closes. Same call the cards
   *  in the canvas make - one operation, one code path. */
  onSelect: (productId: string) => Promise<void>;
}) {
  // Escape closes it. Expected of any overlay, and cheap to honour.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const options = group.options;
  const current = options.find((option) => option.chosen) ?? options[0];

  // The customer's own words, for the subtitle. Shown so the comparison is
  // visibly against THEIR priorities rather than some general idea of good.
  const priorities = [
    ...(mission.constraints?.items ?? []).map((c) => c.value),
    ...(mission.preferences?.items ?? []).map((p) => p.value),
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Compare ${group.category}`}
      onClick={onClose}
    >
      {/* Clicking the backdrop closes; clicking the panel must not, so the
          panel stops the click travelling up to the backdrop. */}
      <div
        className="w-full max-w-5xl rounded-lg border border-line bg-surface p-7 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="font-display text-[20px] font-bold tracking-tight">
              Compare {group.category}
            </h2>
            {priorities.length > 0 && (
              <p className="mt-1 text-[12.5px] text-muted">
                Against your priorities: {priorities.join(", ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="rounded-md border border-line px-2.5 py-1 text-[13px] text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* One column per product. grid rather than a table because each cell
            is a small stack rather than a single value. */}
        <div
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
          {options.map((option, index) => (
            <Column
              key={option.product_id}
              option={option}
              current={current}
              index={index}
              basket={basket}
              quantity={group.quantity}
              onSelect={onSelect}
            />
          ))}
        </div>

        <p className="mt-6 border-t border-line pt-4 text-[11.5px] text-muted">
          Specifications are not compared because the catalogue returns them as
          free text rather than fields — there is nothing reliable to line up in
          a row. Prices are live, fetched when this basket was opened.
        </p>
      </div>
    </div>
  );
}

/** One product's column. */
function Column({
  option,
  current,
  index,
  basket,
  quantity,
  onSelect,
}: {
  option: BasketOption;
  current: BasketOption;
  index: number;
  basket: { total: string; remaining: string | null; currency: string };
  quantity: number;
  onSelect: (productId: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const isCurrent = option.product_id === current.product_id;

  // What switching to this would do to the basket. Plain subtraction on the
  // line totals - the single most useful thing on this screen, and the only
  // one that is certain.
  const delta = amount(option.line_total) - amount(current.line_total);
  const remainingAfter =
    basket.remaining === null ? null : amount(basket.remaining) - delta;

  return (
    <div
      className={`rounded-md border p-4 ${isCurrent ? "border-olive/50 bg-olive/5" : "border-line"}`}
    >
      <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {isCurrent ? "CURRENT PICK" : `OPTION ${String.fromCharCode(65 + index)}`}
      </span>

      <h3 className="mt-2 text-[13.5px] font-semibold leading-snug">{option.title}</h3>

      <div className="tnum mt-2 font-display text-[20px] font-bold">
        {money(option.price_amount, option.currency)}
      </div>
      {quantity > 1 && (
        <div className="tnum text-[11.5px] text-muted">
          ×{quantity} = {money(option.line_total, option.currency)}
        </div>
      )}

      <Row label="Sold by">{option.merchant_name}</Row>
      <Row label="Reviews">
        {option.ratings
          ? `${option.ratings.value} · ${option.ratings.count.toLocaleString()} ratings`
          : "No ratings yet"}
      </Row>
      <Row label="Shortlisted as">{option.included_as}</Row>

      {/* The honest version of "how this maps to your priorities": the four
          things that were actually measured, not a made-up total. */}
      <div className="mt-4 border-t border-line pt-3">
        <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
          HOW IT SCORED
        </span>
        <div className="mt-2 space-y-1.5">
          <Dots label="Does the job" value={option.breakdown.requirement_match} />
          <Dots label="Suits you" value={option.breakdown.preference_match} />
          <Dots label="Well reviewed" value={option.breakdown.quality} />
          <Dots label="Good price here" value={option.breakdown.price} />
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
          EFFECT ON BASKET
        </span>
        <p className="tnum mt-1.5 text-[12.5px]">
          {isCurrent ? (
            "No change"
          ) : (
            <>
              <span className={delta > 0 ? "text-clay" : "text-olive"}>
                {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                {money(String(Math.abs(delta)), option.currency)}
              </span>
              {remainingAfter !== null && (
                <span className={remainingAfter < 0 ? "text-clay" : "text-muted"}>
                  {" "}
                  · {money(String(Math.abs(remainingAfter)), option.currency)}{" "}
                  {/* "left" is meaningless once the number is negative. Past
                      zero the honest word is "over", and the figure is shown
                      without its minus sign because the word carries it. */}
                  {remainingAfter < 0 ? "over" : "left"}
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {option.note && (
        <p className="mt-3 text-[12px] leading-[1.5] text-muted">{option.note}</p>
      )}

      {option.trade_offs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {option.trade_offs.map((tradeOff, i) => (
            <li key={i} className="text-[11.5px] leading-[1.45] text-clay">
              · {tradeOff}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <button
          type="button"
          disabled={saving || (isCurrent && option.selected_by === "customer")}
          onClick={async () => {
            setSaving(true);
            try {
              await onSelect(option.product_id);
            } finally {
              setSaving(false);
            }
          }}
          className={`w-full rounded-md px-3 py-2 text-[12.5px] font-medium ${
            isCurrent
              ? "border border-olive/40 bg-olive/5 text-olive disabled:opacity-70"
              : "bg-olive text-paper"
          }`}
        >
          {saving
            ? "Saving…"
            : isCurrent
              ? option.selected_by === "customer"
                ? "Your pick"
                : "Keep current"
              : "Switch to this"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 text-[12px]">
      <span className="text-muted">{label}</span>
      <div className="text-ink">{children}</div>
    </div>
  );
}

/**
 * A 0-1 value drawn as five dots.
 *
 * Dots rather than a number because the brief asks for a qualitative reading,
 * and because "0.65" invites a precision the underlying judgement does not
 * have - the model answered high/medium/low and the engine turned that into a
 * figure. Five filled circles say "quite good" without pretending to two
 * decimal places.
 */
function Dots({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return null;
  const filled = Math.round(Math.min(1, Math.max(0, value)) * 5);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] text-muted">{label}</span>
      <span className="flex gap-[3px]" aria-label={`${filled} out of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            aria-hidden
            className={`h-[7px] w-[7px] rounded-full ${i < filled ? "bg-olive" : "bg-line"}`}
          />
        ))}
      </span>
    </div>
  );
}
