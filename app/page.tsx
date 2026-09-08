"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MissionPriority } from "@/lib/api";
import { createMission, startRun } from "@/lib/api";

/**
 * The Mission Composer.
 *
 * Deliberately not a greeting. The brief is specific about this: no "Hello, how
 * can I help?" - a goal composer, with the example already filled in so the
 * shape of a good answer is obvious before anybody types.
 *
 * One press does the whole thing: the mission is created, the run is started,
 * and the workspace opens on a mission that is already working. That sequence
 * is the product's promise in three lines of code.
 */

const MAX_GOAL = 240;

// Each example names its budget in the goal itself, so picking one fills the
// goal and nothing else. The planner reads the figure out of the sentence.
const EXAMPLES = [
  { goal: "Set up a home office under $900", detail: "desk, chair, light" },
  { goal: "Camping kit for two, $600", detail: "tent, bags, cooking" },
  { goal: "Restock a first apartment kitchen for $450", detail: "plates, pans, utensils" },
];

export default function Composer() {
  const [goal, setGoal] = useState("Build a home gym under $1,200");

  // Deliberately empty, even though the example goal names a figure.
  //
  // Pre-filling both means two places say what the budget is, and they stop
  // agreeing the moment somebody rewrites the goal and leaves the box alone.
  // That happened: a goal saying 2000 CAD created a mission budgeted at 1200,
  // silently, because the backend only reads a budget out of the sentence when
  // this field is empty.
  //
  // Blank keeps one source of truth - type a number and it wins, leave it and
  // your own words are used.
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<MissionPriority>("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function start() {
    if (!goal.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const mission = await createMission({
        goal: goal.trim(),
        budget_amount: budget ? Number(budget) : undefined,
        budget_currency: "CAD",
        location: location.trim() || undefined,
        priority,
      });

      // Start the work before navigating. By the time the workspace paints,
      // the planner is already running - so it opens on something happening
      // rather than on an empty page with a button.
      await startRun(mission.id);
      router.push(`/missions/${mission.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start.");
      setBusy(false);
    }
  }

  const nearLimit = goal.length > MAX_GOAL - 40;

  return (
    <main className="mx-auto w-full max-w-2xl px-8 py-16">
      <h1 className="font-display text-[28px] font-bold tracking-tight">
        What are you trying to accomplish?
      </h1>
      <p className="mt-2 max-w-lg text-[13px] leading-[1.6] text-muted">
        Describe the whole goal. It plans the items, prices them against your
        budget, and prepares a basket you approve.
      </p>

      <div className="mt-7 rounded-lg border border-ink bg-surface p-5">
        <label htmlFor="goal" className="sr-only">
          Your goal
        </label>
        <textarea
          id="goal"
          value={goal}
          maxLength={MAX_GOAL}
          onChange={(event) => setGoal(event.target.value)}
          rows={2}
          className="w-full resize-none bg-transparent font-display text-[19px] font-semibold tracking-tight outline-none placeholder:text-muted/50"
          placeholder="Build a home gym under $1,200"
        />
        <div
          className={`tnum text-right font-mono text-[11px] ${nearLimit ? "text-clay" : "text-muted/70"}`}
        >
          {goal.length} / {MAX_GOAL}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Field label="Budget">
          <div className="flex items-center gap-1">
            <span className="text-muted">$</span>
            <input
              value={budget}
              onChange={(event) => setBudget(event.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="read from your goal"
              className="tnum w-full bg-transparent outline-none"
            />
          </div>
        </Field>

        <Field label="Ship to">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Vancouver, BC"
            className="w-full bg-transparent outline-none"
          />
        </Field>

        <Field label="Priority">
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as MissionPriority)}
            className="w-full bg-transparent outline-none"
          >
            <option value="balanced">Balanced</option>
            <option value="quality">Quality</option>
            <option value="value">Value</option>
            {/* Offered by the brief, but nothing scores delivery yet - the
                catalogue returns no shipping time. Disabled rather than
                accepted and quietly ignored. */}
            <option value="speed" disabled>
              Speed — needs delivery data
            </option>
          </select>
        </Field>
      </div>

      {/* Leaving the location blank is allowed, but it is the one field whose
          absence really costs something, so it is said here rather than
          discovered later as an empty result. */}
      {!location.trim() && (
        <p className="mt-2 text-[11.5px] text-muted">
          Without a location, prices come back in each shop&apos;s own currency —
          you will be asked for one before searching.
        </p>
      )}

      {error && <p className="mt-4 text-[12.5px] text-clay">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy || !goal.trim()}
        className="mt-5 rounded-md bg-olive px-5 py-2.5 text-[13.5px] font-medium text-paper disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start shopping"}
      </button>
      <p className="mt-2 text-[11.5px] text-muted">
        Nothing is bought until you approve the basket.
      </p>

      <div className="mt-12 border-t border-line pt-6">
        <h2 className="text-[12.5px] font-semibold">Or start from an example</h2>
        <div className="mt-3 grid gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.goal}
              type="button"
              onClick={() => setGoal(example.goal)}
              className="rounded-md border border-line bg-surface px-4 py-3 text-left hover:border-olive"
            >
              <span className="block text-[13px] font-medium">{example.goal}</span>
              <span className="block text-[11.5px] text-muted">{example.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-[13px]">
      <span className="block text-[11px] text-muted">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
