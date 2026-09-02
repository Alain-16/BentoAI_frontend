import type { Mission } from "@/lib/api";
import { Eyebrow, NotYet, Skeleton } from "./ui";

/**
 * The left rail: everything this mission needs to buy.
 *
 * The mockup groups these under headings like "Strength" and "Floor
 * protection". Our requirements carry a category, a priority and a status but no
 * grouping, so this renders them as one ordered list instead of inventing
 * groups the backend never decided. Required and optional are a real division we
 * do have, so that is the one shown.
 */
export function PlanRail({
  mission,
  working,
}: {
  mission: Mission;
  working: boolean;
}) {
  const requirements = [...mission.requirements].sort((a, b) => a.position - b.position);
  const satisfied = requirements.filter((r) => r.status === "satisfied").length;

  return (
    <section>
      <div className="flex items-center justify-between">
        <Eyebrow>PLAN</Eyebrow>
        {requirements.length > 0 && (
          <span className="tnum font-mono text-[11px] text-muted">
            {satisfied} / {requirements.length}
          </span>
        )}
      </div>

      {/* Nothing planned yet. Three placeholder rows say the plan is being
          built - which it is, by the Planning Agent, right now. */}
      {requirements.length === 0 && working && (
        <div className="mt-4 space-y-3">
          <Skeleton width="80%" />
          <Skeleton width="65%" />
          <Skeleton width="72%" />
        </div>
      )}

      <ul className="mt-4 space-y-[10px]">
        {requirements.map((requirement) => {
          const done = requirement.status === "satisfied";
          return (
            <li key={requirement.id} className="flex items-start gap-2.5">
              {/* A filled tick for something we found a product for, an empty
                  ring for something still open. Marked aria-hidden because the
                  word beside it already carries the meaning. */}
              <span
                aria-hidden
                className={`mt-[2px] text-[13px] leading-none ${done ? "text-olive" : "text-muted/50"}`}
              >
                {done ? "✓" : "○"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`text-[13px] ${done ? "text-ink" : "text-muted"}`}>
                  {requirement.category}
                </span>
                {requirement.quantity > 1 && (
                  <span className="tnum ml-1.5 text-[11.5px] text-muted">
                    ×{requirement.quantity}
                  </span>
                )}
                {requirement.priority === "optional" && (
                  <span className="ml-1.5 text-[11.5px] text-muted/70">· optional</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <NotYet
        className="mt-4 w-full border-dashed"
        reason="Adding a plan item needs a requirements endpoint, which is not built yet."
      >
        + Add item
      </NotYet>
    </section>
  );
}
