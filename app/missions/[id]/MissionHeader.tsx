import type { Basket, Mission } from "@/lib/api";
import { money } from "@/lib/api";
import { BudgetMeter } from "./BudgetMeter";
import { Chip, NotYet, Skeleton } from "./ui";

/** Words for each mission state, shown as a chip while work is happening. */
const PHASE: Record<string, string> = {
  draft: "Starting",
  planning: "Planning",
  searching: "Searching",
  evaluating: "Comparing",
  review: "Ready to review",
};

/**
 * The persistent top zone: what this mission is, the limits it works under, and
 * the budget meter.
 *
 * Constraint chips are built from what the mission actually holds - the budget,
 * the location, and whatever the Planning Agent recorded as a hard constraint or
 * a preference. Nothing here is decoration; each chip is a real thing bounding
 * the search.
 */
export function MissionHeader({
  mission,
  basket,
  working,
}: {
  mission: Mission;
  basket: Basket | null;
  working: boolean;
}) {
  const constraints = mission.constraints?.items ?? [];
  const preferences = mission.preferences?.items ?? [];

  return (
    <header className="border-b border-line bg-surface px-7 py-5">
      <div className="flex items-start justify-between gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate font-display text-[22px] font-bold tracking-tight">
              {mission.goal}
            </h1>

            {/* Rename needs an endpoint that updates the goal. There is none,
                so the control is shown and disabled rather than dropped. */}
            <NotYet reason="Renaming needs a mission update endpoint, which is not built yet.">
              Rename
            </NotYet>

            {working && PHASE[mission.status] && (
              <span className="rounded-md border border-olive/30 bg-olive/5 px-2.5 py-[5px] font-mono text-[11px] font-medium text-olive">
                {PHASE[mission.status]}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {mission.budget_amount && (
              <Chip>Budget {money(mission.budget_amount, mission.budget_currency)}</Chip>
            )}
            {mission.location && <Chip>{mission.location}</Chip>}

            {constraints.map((c, i) => (
              <Chip key={`c${i}`}>{c.value}</Chip>
            ))}
            {preferences.map((p, i) => (
              <Chip key={`p${i}`}>
                {p.type.replace(/_/g, " ")}: {p.value}
              </Chip>
            ))}

            {/* Nothing has been planned yet, so there are no chips to show.
                A couple of blanks say "these are coming" better than a gap. */}
            {working && constraints.length === 0 && (
              <>
                <Skeleton width={110} height={28} />
                <Skeleton width={90} height={28} />
              </>
            )}

            <NotYet reason="Editing constraints needs a mission update endpoint, which is not built yet.">
              + Add constraint
            </NotYet>
          </div>
        </div>

        <BudgetMeter mission={mission} basket={basket} working={working} />
      </div>
    </header>
  );
}
