import type { Basket } from "@/lib/api";
import { money } from "@/lib/api";
import { Eyebrow, NotYet, Skeleton } from "./ui";

/**
 * The persistent bottom zone: what is actually going to be bought.
 *
 * Together with the budget meter this is one of the two things the brief says
 * must survive on every screen and every size - the running total and what it
 * leaves. Everything else can reflow away.
 */
export function BasketDock({
  basket,
  working,
}: {
  basket: Basket | null;
  working: boolean;
}) {
  const chosen =
    basket?.requirements.flatMap((group) => group.options.filter((o) => o.chosen)) ?? [];

  return (
    <div className="flex items-center gap-6 border-t border-line bg-surface px-7 py-3.5">
      <div className="flex shrink-0 items-center gap-2.5">
        <Eyebrow>BASKET</Eyebrow>
        <span className="text-[13.5px] font-semibold">
          {basket ? `${chosen.length} item${chosen.length === 1 ? "" : "s"}` : "—"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {!basket && working && (
          <>
            <Skeleton width={120} height={30} className="rounded-md" />
            <Skeleton width={100} height={30} className="rounded-md" />
          </>
        )}

        {!basket && !working && (
          // The brief's rule for empty states: give direction, not mood.
          <span className="text-[12.5px] text-muted">
            Nothing added yet. The basket fills once products have been compared.
          </span>
        )}

        {chosen.map((option) => (
          <span
            key={option.product_id}
            className="shrink-0 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px]"
            title={option.title}
          >
            <span className="mr-1.5">{shortTitle(option.title)}</span>
            {option.quantity > 1 && (
              <span className="tnum mr-1 text-muted">×{option.quantity}</span>
            )}
            {/* The line total, not the unit price - the dock adds up to the
                basket total beside it, and unit prices would not. */}
            <b className="tnum font-semibold">
              {money(option.line_total, option.currency)}
            </b>
          </span>
        ))}
      </div>

      {basket && (
        <div className="shrink-0 text-right">
          <div className="tnum text-[13px] font-semibold">
            {money(basket.total, basket.budget_currency)}
          </div>
          <div
            className={`tnum text-[11.5px] ${basket.feasible ? "text-muted" : "text-clay"}`}
          >
            {basket.remaining !== null
              ? `${money(basket.remaining, basket.budget_currency)} left`
              : "no budget set"}
          </div>
        </div>
      )}

      <NotYet
        className="shrink-0 border-olive/40 text-olive/70"
        reason="Approving a basket needs POST /selections and the Smart Basket, which are not built yet."
      >
        Review basket
      </NotYet>
    </div>
  );
}

/** Product titles are long. The dock has room for a couple of words, and the
 *  full title is on the hover title attribute for anyone who wants it. */
function shortTitle(title: string): string {
  const words = title.split(/\s+/);
  return words.length <= 3 ? title : words.slice(0, 3).join(" ") + "…";
}
