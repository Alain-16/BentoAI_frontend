"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * A temporary door into the workspace.
 *
 * The real start screen is the Mission Composer, which is a later frame. Until
 * it exists there has to be some way to open a mission, so this takes an id and
 * navigates. Delete it when the composer lands.
 */
export default function Home() {
  const [id, setId] = useState("");
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-10">
      <h1 className="font-display text-[24px] font-bold tracking-tight">BentoAI</h1>
      <p className="mt-2 text-[13px] text-muted">
        Paste a mission id to open its workspace. The Mission Composer is not
        built yet.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (id.trim()) router.push(`/missions/${id.trim()}`);
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={id}
          onChange={(event) => setId(event.target.value)}
          placeholder="29e5b4cf-5fc9-458e-a7e2-8cbad20be496"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-olive"
        />
        <button
          type="submit"
          className="rounded-md bg-olive px-4 py-2 text-[13px] font-medium text-paper"
        >
          Open
        </button>
      </form>
    </main>
  );
}
