import type { BasketOption } from "@/lib/api";
import { money } from "@/lib/api";
import { useState } from "react";
import { Chip, NotYet } from "./ui";

/**
 * One product the customer could buy for one requirement.
 *
 * The brief bans a fabricated match percentage, so nothing here shows the
 * score. What it shows instead is the reason the model gave, the trade-offs it
 * named, and the merchant - the actual grounds for the pick, in the customer's
 * terms.
 */
export function ProductCard({
  option,
  chosen,
  onCompare,
  onSelect,
}: {
  option: BasketOption;
  chosen: boolean;
  /** Opens the comparison for this product's requirement. Left out when there
   *  is only one option, because there is nothing to compare it against. */
  onCompare?: () => void;
  /** Puts this product in the basket for its requirement. */
  onSelect?: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function choose() {
    if (!onSelect) return;
    setSaving(true);
    try {
      await onSelect();
    } finally {
      setSaving(false);
    }
  }
  return (
    <article
      className={`rounded-md border bg-surface p-4 ${
        chosen ? "border-olive/50" : "border-line"
      }`}
    >
      <div className="flex gap-4">
        {/* The product image is loaded straight from the merchant's CDN with a
            plain <img>, not next/image.

            next/image would fetch the picture onto our server, re-encode it and
            serve our own copy - and the catalog's terms say images must be
            rendered live rather than downloaded. The plain tag is both the
            compliant choice and the one that needs no configuration. */}
        {option.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.image_url}
            alt=""
            className="h-[76px] w-[76px] shrink-0 rounded-md border border-line object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-[76px] w-[76px] shrink-0 rounded-md bg-sage/40" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold">{option.title}</h3>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                Sold by {option.merchant_name} · Priced today
              </p>
            </div>
            <div className="text-right">
              <div className="tnum font-display text-[18px] font-bold">
                {money(option.price_amount, option.currency)}
              </div>
              {/* Only shown when it is more than one. A silent "x1" on every
                  card would be noise; "x3" is the difference between a 47
                  shirt and a 141 line. */}
              {option.quantity > 1 && (
                <div className="tnum text-[11.5px] text-muted">
                  ×{option.quantity} ={" "}
                  <b className="font-semibold text-ink">
                    {money(option.line_total, option.currency)}
                  </b>
                </div>
              )}
              {option.ratings && (
                <div className="tnum text-[11px] text-muted">
                  {option.ratings.value} ★ · {option.ratings.count}
                </div>
              )}
            </div>
          </div>

          {option.price_was && (
            <p className="tnum mt-1 text-right text-[11.5px] text-clay">
              was {money(option.price_was, option.currency)}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {/* Why it is on the shortlist at all - "best score" or "cheapest
                that passed" - is a fact the optimizer recorded, so it is worth
                showing. */}
            {option.included_as && <Chip>{option.included_as}</Chip>}
            {option.trade_offs.slice(0, 2).map((tradeOff, i) => (
              <Chip key={i} tone="clay">
                {tradeOff}
              </Chip>
            ))}
          </div>

          {/* "Priced today" above is literally true: the basket re-fetches every
              price from the catalog on every read, because a stale price is the
              one thing a shopping product must never show. */}
          {(option.note || option.reason) && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[12.5px] font-medium text-olive marker:content-['']">
                Why this pick
              </summary>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-muted">
                {option.note || option.reason}
              </p>
            </details>
          )}

          <div className="mt-3 flex gap-2">
            {onCompare ? (
              <button
                type="button"
                onClick={onCompare}
                className="rounded-md border border-line px-3 py-[7px] text-[12.5px] font-medium text-ink hover:border-olive hover:text-olive"
              >
                Compare
              </button>
            ) : (
              <NotYet reason="There is only one option for this item, so there is nothing to compare.">
                Compare
              </NotYet>
            )}
            {/* Keep and Swap are the same request - "this is my choice for
                this requirement". Which word is shown depends only on whether
                it is already the choice. */}
            <button
              type="button"
              onClick={choose}
              disabled={saving || (chosen && option.selected_by === "customer")}
              className={`rounded-md border px-3 py-[7px] text-[12.5px] font-medium ${
                chosen
                  ? "border-olive/40 bg-olive/5 text-olive disabled:opacity-70"
                  : "border-line text-ink hover:border-olive hover:text-olive"
              }`}
            >
              {saving
                ? "Saving…"
                : chosen
                  ? option.selected_by === "customer"
                    ? "Your pick"
                    : "Keep"
                  : "Swap to this"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
