"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityEvent, Basket, Mission } from "@/lib/api";
import {
  currentActivity,
  getActivity,
  getBasket,
  getMission,
  isWorking,
  startRun,
} from "@/lib/api";
import { ActivityLog } from "./ActivityLog";
import { BasketDock } from "./BasketDock";
import { Canvas } from "./Canvas";
import { CommandBar } from "./CommandBar";
import { MissionHeader } from "./MissionHeader";
import { PlanRail } from "./PlanRail";
import { Questions } from "./Questions";
import { Skeleton } from "./ui";

/** How often to ask the backend what has changed.
 *
 *  Two seconds because the steps themselves take tens of seconds - a faster
 *  poll would ask the same question repeatedly and learn nothing. This is also
 *  why there is no websocket: at this pace, polling costs one small request and
 *  none of the connection handling a push would need. */
const POLL_MS = 2000;

export function Workspace({ missionId }: { missionId: string }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [basket, setBasket] = useState<Basket | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Bumping this restarts the effect below. It is how an action - answering a
  // question, pressing "Start shopping" - asks for a fresh look without the
  // effect needing to know those actions exist.
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    // Set when the screen goes away or the effect re-runs, so a reply that
    // arrives late does not update something that is no longer on screen.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    async function poll() {
      try {
        // All three at once. They do not depend on each other, so asking in
        // sequence would make every refresh three times slower than it needs
        // to be.
        const [nextMission, nextActivity, nextBasket] = await Promise.all([
          getMission(missionId),
          getActivity(missionId),
          getBasket(missionId),
        ]);
        if (cancelled) return;

        setMission(nextMission);
        setActivity(nextActivity);
        setBasket(nextBasket);
        setError(null);
        failures = 0;

        // Whether to look again is decided from the answer we just got, not
        // from a variable captured when the effect started. That is what stops
        // the loop running on a stale idea of what the mission was doing.
        if (isWorking(nextMission, nextBasket)) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof Error ? caught.message : "Could not reach the server.",
        );

        // A blip should not end the watch, but a server that is genuinely down
        // should not be hammered either. Back off, and give up after a few
        // tries so the page settles on an error the customer can act on.
        failures += 1;
        if (failures < 5) timer = setTimeout(poll, POLL_MS * failures);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [missionId, reloadToken]);

  const working = mission ? isWorking(mission, basket) : false;

  if (error && !mission) {
    return (
      <main className="p-10">
        <h1 className="font-display text-[18px] font-bold">Could not load this mission</h1>
        <p className="mt-2 text-[13px] text-muted">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 rounded-md bg-olive px-4 py-2 text-[13px] font-medium text-paper"
        >
          Try again
        </button>
      </main>
    );
  }

  // The first couple of hundred milliseconds. Chrome-shaped, not blank - the
  // same treatment a running mission gets, so there is no flash of nothing.
  if (!mission) {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="border-b border-line bg-surface px-7 py-5">
          <Skeleton width={260} height={26} />
          <div className="mt-3 flex gap-2">
            <Skeleton width={110} height={28} />
            <Skeleton width={90} height={28} />
          </div>
        </div>
        <div className="flex-1 p-7">
          <Skeleton width="40%" height={16} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <MissionHeader mission={mission} basket={basket} working={working} />

      {/* A mission nobody has started yet. One button, and the whole workflow
          runs from it - which is the product's promise made literal. */}
      {mission.status === "draft" && mission.pending_questions.length === 0 && (
        <div className="border-b border-line bg-surface px-7 py-4">
          <button
            onClick={async () => {
              await startRun(mission.id);
              refresh();
            }}
            className="rounded-md bg-olive px-4 py-2 text-[13px] font-medium text-paper"
          >
            Start shopping
          </button>
        </div>
      )}

      <Questions mission={mission} onAnswered={refresh} />

      {/* Something went wrong on a refresh, but we still have the last good
          data. Show both: the screen stays useful and the problem is not
          hidden. */}
      {error && (
        <p className="border-b border-clay/30 bg-clay/5 px-7 py-2 text-[12.5px] text-clay">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-line p-5">
          <PlanRail mission={mission} working={working} />
          <ActivityLog events={activity} current={currentActivity(mission, basket)} />
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <Canvas mission={mission} basket={basket} working={working} />
        </div>
      </div>

      <BasketDock basket={basket} working={working} />
      <CommandBar />
    </main>
  );
}
