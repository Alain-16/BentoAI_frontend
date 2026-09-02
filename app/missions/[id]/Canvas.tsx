"use client";

import { useState } from "react";
import type { Basket, Mission } from "@/lib/api";
import { Compare } from "./Compare";
import { ProductCard } from "./ProductCard";
import { Eyebrow, Skeleton } from "./ui";

/**
 * The middle zone: what the agents found, grouped by the thing it satisfies.
 *
 * Each group is one requirement. The chosen product leads; the rest are the
 * alternatives the optimizer kept in the pool, shown so the customer can
 * disagree with the pick rather than only accept it.
 */
export function Canvas({
  mission,
  basket,
  working,
}: {
  mission: Mission;
  basket: Basket | null;
  working: boolean;
}) {
  // Which requirement's comparison is open, by id. Held here rather than in
  // each card because the overlay compares a whole group - a card only knows
  // about itself.
  const [comparing, setComparing] = useState<string | null>(null);
  if (!basket) {
    return (
      <div className="space-y-4 p-7">
        {working ? (
          // Card-shaped placeholders. The point of matching the shape is that
          // the page already looks like what it is about to become.
          [0, 1, 2].map((i) => (
            <div key={i} className="rounded-md border border-line bg-surface p-4">
              <div className="flex gap-4">
                <Skeleton width={76} height={76} className="rounded-md" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <Skeleton width="55%" height={16} />
                  <Skeleton width="35%" height={12} />
                  <Skeleton width="70%" height={12} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[13px] text-muted">
            Nothing found yet. Start the mission to search for products.
          </p>
        )}
      </div>
    );
  }

  const openGroup = basket.requirements.find(
    (group) => group.requirement_id === comparing,
  );

  return (
    <div className="space-y-8 p-7">
      {openGroup && (
        <Compare
          mission={mission}
          group={openGroup}
          basket={{
            total: basket.total,
            remaining: basket.remaining,
            currency: basket.budget_currency,
          }}
          onClose={() => setComparing(null)}
        />
      )}

      {basket.requirements.map((group) => {
        const chosen = group.options.find((option) => option.chosen);
        const alternatives = group.options.filter((option) => !option.chosen);

        return (
          <section key={group.requirement_id}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-[13px] font-semibold">{group.category}</h2>
              {chosen && (
                <span className="rounded border border-olive/30 bg-olive/5 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.1em] text-olive">
                  CHOSEN
                </span>
              )}
              {group.priority === "optional" && (
                <span className="text-[11.5px] text-muted">optional</span>
              )}
              {alternatives.length > 0 && (
                <span className="text-[11.5px] text-muted">
                  {alternatives.length} alternative
                  {alternatives.length === 1 ? "" : "s"} priced — switch any time
                </span>
              )}
            </div>

            <div className="space-y-3">
              {chosen && (
                <ProductCard
                  option={chosen}
                  chosen
                  onCompare={
                    group.options.length > 1
                      ? () => setComparing(group.requirement_id)
                      : undefined
                  }
                />
              )}
              {alternatives.map((option) => (
                <ProductCard
                  key={option.product_id}
                  option={option}
                  chosen={false}
                  onCompare={
                    group.options.length > 1
                      ? () => setComparing(group.requirement_id)
                      : undefined
                  }
                />
              ))}
            </div>

            {/* A required thing with nothing to buy is the honest failure the
                brief insists on surfacing rather than hiding. */}
            {group.options.length === 0 && (
              <p className="text-[12.5px] text-clay">
                Nothing suitable was found for this item.
              </p>
            )}
          </section>
        );
      })}

      {basket.requirements.length === 0 && (
        <div>
          <Eyebrow>NOTHING TO SHOW</Eyebrow>
          <p className="mt-2 text-[13px] text-muted">
            No products survived the checks for this mission.
          </p>
        </div>
      )}
    </div>
  );
}
