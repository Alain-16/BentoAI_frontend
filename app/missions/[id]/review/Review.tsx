"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Basket, Mission } from "@/lib/api";
import {
  amount,
  approveBasket,
  getBasket,
  getMission,
  money,
  selectProduct,
} from "@/lib/api";

/**
 * Review and approve - the money moment.
 *
 * Everything here is checked again on the server when Approve is pressed, so
 * what this screen shows and what gets approved cannot drift apart. Prices are
 * live: the basket endpoint re-fetches every one on every read, because §5.11
 * forbids a stale price reaching checkout and this is the last point before it
 * would.
 */
export function Review({ missionId }: { missionId: string }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [basket, setBasket] = useState<Basket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(0);

  const refresh = useCallback(() => setToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, b] = await Promise.all([getMission(missionId), getBasket(missionId)]);
        if (cancelled) return;
        setMission(m);
        setBasket(b);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missionId, token]);

  if (error && !basket) {
    return <Shell><p className="text-[13px] text-clay">{error}</p></Shell>;
  }

  if (!mission || !basket) {
    return <Shell><p className="text-[13px] text-muted">Loading…</p></Shell>;
  }

  const approved = mission.status !== "review";
  const blocked = basket.blockers.length > 0;
  const over = basket.remaining !== null && amount(basket.remaining) < 0;

  const selected = basket.requirements
    .map((group) => ({ group, option: group.options.find((o) => o.chosen) }))
    .filter((row) => row.option);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await approveBasket(missionId);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[12.5px] text-muted">{mission.goal}</p>
          <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight">
            {approved ? "Basket approved" : "Review and approve"}
          </h1>
        </div>
        <Link
          href={`/missions/${missionId}`}
          className="rounded-md border border-line px-3 py-2 text-[12.5px] font-medium text-muted hover:text-ink"
        >
          Back to workspace
        </Link>
      </div>

      {/* The four things somebody needs to know before spending money. */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        <Tile label="Plan items met">
          {basket.requirements_met} / {basket.requirements_total}
        </Tile>
        <Tile label="Budget" tone={over ? "clay" : "olive"}>
          {basket.remaining === null
            ? "not set"
            : `${money(String(Math.abs(amount(basket.remaining))), basket.budget_currency)} ${over ? "over" : "under"}`}
        </Tile>
        <Tile label="Stock" tone={blocked ? "clay" : "olive"}>
          {basket.item_count - basket.blockers.length} of {basket.item_count} available
        </Tile>
        <Tile label="Merchants">{basket.merchant_count}</Tile>
      </div>

      {/* Anything that cannot be bought right now, with a way out. The brief
          insists these are surfaced here and resolved before approval rather
          than dropped quietly. */}
      {basket.blockers.map((blocker) => (
        <div
          key={blocker.requirement_id}
          className="mt-4 rounded-md border border-clay/40 bg-clay/5 p-4"
        >
          <p className="text-[13px] font-semibold text-clay">
            {blocker.title}{" "}
            {blocker.reason === "out_of_stock"
              ? "is out of stock"
              : "is no longer listed"}
          </p>
          {blocker.replacement ? (
            <>
              <p className="mt-1 text-[12.5px] text-muted">
                Replacement available: {blocker.replacement.title} at{" "}
                {blocker.replacement.merchant_name},{" "}
                {money(blocker.replacement.price, blocker.replacement.currency)}.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await selectProduct(
                      missionId,
                      blocker.requirement_id,
                      blocker.replacement!.product_id,
                    );
                    refresh();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-3 rounded-md bg-olive px-3 py-2 text-[12.5px] font-medium text-paper"
              >
                Use replacement —{" "}
                {money(blocker.replacement.price, blocker.replacement.currency)}
              </button>
            </>
          ) : (
            <p className="mt-1 text-[12.5px] text-muted">
              Nothing else was found for {blocker.category}. Go back and search
              again, or change the plan.
            </p>
          )}
        </div>
      ))}

      {/* Every line names its merchant. "Priced today" is literally true - the
          price beside it was fetched when this page loaded. */}
      <h2 className="mt-8 font-mono text-[11px] font-medium tracking-[0.14em] text-muted">
        ITEMS — {basket.item_count} LINES, {basket.merchant_count} MERCHANT
        {basket.merchant_count === 1 ? "" : "S"}
      </h2>

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {selected.map(({ group, option }) => (
          <li key={group.requirement_id} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{option!.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                {option!.merchant_name} · Priced today · In stock
              </p>
            </div>
            <div className="tnum shrink-0 text-right text-[13.5px] font-semibold">
              {money(option!.line_total, option!.currency)}
              {option!.quantity > 1 && (
                <span className="block text-[11px] font-normal text-muted">
                  {money(option!.price_amount, option!.currency)} × {option!.quantity}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 max-w-sm">
        <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted">
          COST
        </h2>
        <Line label={`Products (${basket.item_count})`}>
          {money(basket.total, basket.budget_currency)}
        </Line>
        {/* Named rather than left out. An absent shipping line reads as free
            shipping, which would be a guess we have no basis for. */}
        <Line label="Shipping" muted>
          not calculated
        </Line>
        <Line label="Tax" muted>
          not calculated
        </Line>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
          <span className="text-[13px] font-semibold">Total</span>
          <span className="tnum font-display text-[20px] font-bold">
            {money(basket.total, basket.budget_currency)}
          </span>
        </div>
        {basket.remaining !== null && (
          <p className={`mt-1 text-[12px] ${over ? "text-clay" : "text-muted"}`}>
            {money(String(Math.abs(amount(basket.remaining))), basket.budget_currency)}{" "}
            {over ? "over" : "under"} your{" "}
            {money(basket.budget_amount, basket.budget_currency)} budget
          </p>
        )}
      </div>

      {/* The honest version of the brief's "what happens on approval". It does
          not charge anyone, because there is no checkout yet - and a button
          that sounds like it spends money and does not is worse than none. */}
      <div className="mt-8 rounded-md border border-line bg-surface p-4">
        <h3 className="text-[13px] font-semibold">What happens when you approve</h3>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-muted">
          Nothing is bought and no card is charged. Approving locks this basket
          as the one you have settled on and marks the mission ready for
          checkout. Buying from{" "}
          {basket.merchant_count === 1
            ? "the merchant"
            : `each of the ${basket.merchant_count} merchants`}{" "}
          is a separate step that is not built yet. You can keep editing until
          then.
        </p>
      </div>

      {error && <p className="mt-4 text-[12.5px] text-clay">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        {approved ? (
          <span className="rounded-md border border-olive/40 bg-olive/5 px-4 py-2.5 text-[13px] font-medium text-olive">
            Approved — {money(basket.total, basket.budget_currency)}
          </span>
        ) : (
          <button
            type="button"
            onClick={approve}
            disabled={busy || blocked || basket.item_count === 0}
            title={blocked ? "Resolve the items above to enable" : undefined}
            className="rounded-md bg-olive px-4 py-2.5 text-[13px] font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Approving…"
              : `Approve basket — ${money(basket.total, basket.budget_currency)}`}
          </button>
        )}
        <Link
          href={`/missions/${missionId}`}
          className="text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Keep editing
        </Link>
        {blocked && (
          <span className="text-[12px] text-clay">
            Resolve the items above to enable
          </span>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-8 py-10">{children}</main>;
}

function Tile({
  label,
  children,
  tone = "default",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "default" | "olive" | "clay";
}) {
  const colour =
    tone === "clay" ? "text-clay" : tone === "olive" ? "text-olive" : "text-ink";
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`tnum mt-1 text-[15px] font-semibold ${colour}`}>{children}</div>
    </div>
  );
}

function Line({
  label,
  children,
  muted = false,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="mt-2 flex items-baseline justify-between text-[12.5px]">
      <span className="text-muted">{label}</span>
      <span className={muted ? "text-muted/70" : "tnum text-ink"}>{children}</span>
    </div>
  );
}
