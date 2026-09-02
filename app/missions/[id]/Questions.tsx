"use client";

import { useState } from "react";
import type { Mission } from "@/lib/api";
import { answerQuestions } from "@/lib/api";

/**
 * What an agent needs before it is worth carrying on.
 *
 * This is the whole of the product's "conversation", and note what it is not: a
 * chat thread. The brief's rule is language -> action -> visible state change,
 * so a question arrives as a specific field to fill, the answer changes the
 * mission, and the work resumes. Nobody types a sentence for a model to
 * interpret, which is also why the answer can be trusted.
 *
 * Answering restarts the run on the backend by itself, so there is no second
 * button to press.
 */
export function Questions({
  mission,
  onAnswered,
}: {
  mission: Mission;
  onAnswered: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mission.pending_questions.length === 0) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Only the fields the backend knows how to store. A question whose field
      // is something else can be asked but not yet answered - a real gap, and
      // one worth seeing rather than papering over.
      await answerQuestions(mission.id, {
        location: values.location || undefined,
        budget_amount: values.budget_amount ? Number(values.budget_amount) : undefined,
      });
      onAnswered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-7 mt-6 rounded-md border border-olive/40 bg-olive/5 p-5"
    >
      <h2 className="font-display text-[15px] font-semibold">
        One thing before we carry on
      </h2>

      <div className="mt-4 space-y-4">
        {mission.pending_questions.map((question) => (
          <div key={question.id}>
            <label
              htmlFor={`q-${question.id}`}
              className="block text-[13px] font-medium"
            >
              {question.question}
            </label>
            {question.why && (
              <p className="mt-0.5 text-[11.5px] text-muted">{question.why}</p>
            )}
            <input
              id={`q-${question.id}`}
              // A budget is a number; everywhere else plain text. The input type
              // is what gets a phone keyboard right and stops "abc" reaching the
              // backend as a price.
              type={question.field === "budget_amount" ? "number" : "text"}
              inputMode={question.field === "budget_amount" ? "decimal" : "text"}
              value={values[question.field ?? question.id] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [question.field ?? question.id]: event.target.value,
                }))
              }
              className="mt-2 w-full max-w-md rounded-md border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-olive"
              placeholder={
                question.field === "location" ? "Vancouver, BC" : "e.g. 200"
              }
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-[12.5px] text-clay">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-md bg-olive px-4 py-2 text-[13px] font-medium text-paper disabled:opacity-60"
      >
        {saving ? "Saving…" : "Answer and carry on"}
      </button>
    </form>
  );
}
