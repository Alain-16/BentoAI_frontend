import { Eyebrow } from "./ui";

/**
 * The last zone, and deliberately the quietest.
 *
 * The brief is careful about this one: direct manipulation is primary and the
 * command bar is only for intent with no obvious on-screen control - "avoid
 * Bowflex", "durability over price". It is styled as secondary because making it
 * prominent would turn the product back into the chatbot it is not.
 *
 * It is disabled because the Natural-Language Command Handler (§5.14) does not
 * exist yet. Shown rather than hidden, so the shape of the product is honest.
 */
export function CommandBar() {
  return (
    <div className="border-t border-line bg-paper px-7 py-3">
      <div
        title="Commands need the natural-language command handler, which is not built yet."
        className="flex cursor-not-allowed items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-2.5"
      >
        <span className="text-[13px] text-muted/70">Ask or change anything…</span>

        <div className="flex flex-1 gap-2">
          <span className="rounded border border-line px-2 py-1 text-[11.5px] text-muted/60">
            “everything must ship by Friday”
          </span>
          <span className="rounded border border-line px-2 py-1 text-[11.5px] text-muted/60">
            “durability over price”
          </span>
        </div>

        <Eyebrow>⌘K</Eyebrow>
      </div>
    </div>
  );
}
