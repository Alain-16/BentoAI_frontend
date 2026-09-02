import type { Basket, Mission } from "@/lib/api";
import { amount, money } from "@/lib/api";
import { Skeleton } from "./ui";

/**
 * The signature component.
 *
 * The brief is firm that this is the only place in the product allowed to carry
 * bold colour: "spend your boldness in one place". So the bar is olive while
 * things are fine and clay when they are not, and everything around it stays
 * quiet.
 *
 * It is also the one element that survives on every screen and every size, so
 * it takes its numbers from whatever is available and degrades rather than
 * disappearing when the basket does not exist yet.
 */
export function BudgetMeter({
  mission,
  basket,
  working,
}: {
  mission: Mission;
  basket: Basket | null;
  working: boolean;
}) {
  const budget = amount(mission.budget_amount);
  const spent = basket ? amount(basket.total) : 0;
  const currency = mission.budget_currency;

  // Over budget is a real state with its own colour, not a red tint on the
  // normal one. It also changes the words: a remaining figure is meaningless
  // once it is negative, so we say how far over instead.
  const over = budget > 0 && spent > budget;
  const remaining = budget - spent;

  // How much of the bar is filled. Capped at 100 so an over-budget basket does
  // not draw a bar wider than its own track.
  const filled = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  const statusWord = working ? "Pricing…" : over ? "Over" : "On track";

  return (
    <div className="w-[340px] shrink-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-muted">
          Spent{" "}
          <b className="tnum font-semibold text-ink">{money(basket?.total ?? "0", currency)}</b>{" "}
          of {money(mission.budget_amount, currency)}
        </span>
        <span
          className={`font-mono text-[12px] font-medium ${over ? "text-clay" : "text-olive"}`}
        >
          {statusWord}
        </span>
      </div>

      {/* The bar itself: a sand track with an olive fill. Marked up as a
          progressbar so a screen reader announces the same thing the bar
          shows, rather than nothing at all. */}
      <div
        className="mt-2 h-[10px] overflow-hidden rounded-[2px] bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budget || 100}
        aria-valuenow={spent}
        aria-label="Budget spent"
      >
        <div
          className={`h-full transition-[width] duration-500 ${over ? "bg-clay" : "bg-olive"}`}
          style={{ width: `${filled}%` }}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        {working && !basket ? (
          <Skeleton width={120} height={18} />
        ) : (
          <span
            className={`tnum font-display text-[22px] font-bold tracking-tight ${over ? "text-clay" : "text-ink"}`}
          >
            {over
              ? `${money(String(Math.abs(remaining)), currency)} over`
              : money(String(remaining), currency)}
          </span>
        )}
        <span className="text-[11.5px] text-muted">
          {over ? "over budget" : "remaining"}
        </span>
      </div>

      {/* The mockup shows "incl. $44 est. shipping" here. We do not calculate
          shipping - the catalog does not return it - and inventing a figure on
          the one component the whole product asks people to trust would be the
          worst possible place to guess. So we say what the number is instead. */}
      <p className="mt-1 text-[11px] text-muted/80">Products only — shipping not included</p>
    </div>
  );
}
