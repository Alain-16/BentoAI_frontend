/**
 * Everything the frontend knows about the backend.
 *
 * One file, because every screen talks to the same API and a type that drifts
 * between two copies is worse than no type at all. The shapes below mirror the
 * Pydantic models the backend returns - if one changes there, it changes here.
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/* ------------------------------------------------------------------ types */

export type MissionStatus =
  | "draft"
  | "planning"
  | "searching"
  | "evaluating"
  | "review"
  | "basket_ready"
  | "checkout_pending"
  | "purchased"
  | "tracking"
  | "complete";

/**
 * Money arrives from the backend as a STRING, not a number.
 *
 * That is deliberate on their side: prices are stored as exact decimals, and
 * turning 47.00 into a JavaScript number would hand it to the same floating
 * point maths that makes 0.1 + 0.2 come out at 0.30000000000000004. We keep the
 * string, and only convert when we need to compare or draw a bar.
 */
export type Money = string;

export type Question = {
  id: string;
  field: string | null;
  question: string;
  why?: string;
};

export type Requirement = {
  id: string;
  quantity: number;
  category: string;
  description: string | null;
  priority: "required" | "optional";
  status: "pending" | "satisfied" | "skipped";
  position: number;
  budget_allocation: Money | null;
};

export type Mission = {
  id: string;
  status: MissionStatus;
  goal: string;
  budget_amount: Money | null;
  budget_currency: string;
  location: string | null;
  constraints: { items?: { type: string; value: string; strength: string }[] };
  preferences: { items?: { type: string; value: string }[] };
  created_at: string;
  updated_at: string;
  requirements: Requirement[];
  missing_information: string[];
  pending_questions: Question[];
};

export type ActivityEvent = {
  id: string;
  at: string;
  event_type: string;
  title: string;
  detail: string;
  notes: string[];
};

export type BasketOption = {
  product_id: string;
  provider: string;
  title: string;
  price_amount: Money;
  currency: string;
  /** How many of this the customer wants, and price x that. Both come from the
   *  backend so the arithmetic lives in one place. */
  quantity: number;
  line_total: Money;
  merchant_name: string;
  merchant_domain: string;
  product_url: string | null;
  image_url: string | null;
  ratings: { value: number; count: number } | null;
  score: number;
  included_as: string;
  /** requirement_match / quality / price / preference_match, each 0-1.
   *  The overall score is deliberately not sent - the brief bans showing one. */
  breakdown: Record<string, number>;
  note: string;
  reason: string;
  trade_offs: string[];
  preferred: boolean;
  chosen: boolean;
  /** "optimizer" or "customer" - who put this in the basket. Null unless
   *  chosen. Lets the UI say "you changed this". */
  selected_by: string | null;
  /** What it cost when it was chosen, if that is not what it costs now. */
  price_was: Money | null;
};

export type BasketRequirement = {
  requirement_id: string;
  category: string;
  priority: "required" | "optional";
  quantity: number;
  options: BasketOption[];
};

export type BasketBlocker = {
  requirement_id: string;
  category: string;
  title: string;
  /** "no_longer_listed" or "out_of_stock". */
  reason: string;
  replacement: {
    product_id: string;
    title: string;
    price: Money;
    currency: string;
    merchant_name: string;
  } | null;
};

export type Basket = {
  mission_id: string;
  status: string;
  budget_amount: Money | null;
  budget_currency: string;
  total: Money;
  remaining: Money | null;
  feasible: boolean;
  requirements: BasketRequirement[];
  notes: string[];
  /** Anything in here must be resolved before the basket can be approved. */
  blockers: BasketBlocker[];
  item_count: number;
  merchant_count: number;
  requirements_met: number;
  requirements_total: number;
};

export type RunAck = {
  mission_id: string;
  status: MissionStatus;
  started: boolean;
  pending_questions: Question[];
};

/* --------------------------------------------------------------- fetching */

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`${status}: ${detail}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    // Never serve a remembered copy. The whole screen is about live state, and
    // a cached mission is a lie about what the agents are doing right now.
    cache: "no-store",
  });

  if (!response.ok) {
    // FastAPI puts its message in "detail". If the body is not JSON at all -
    // a proxy error page, say - fall back to the status text rather than
    // throwing a second error while handling the first.
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

export const getMission = (id: string) => request<Mission>(`/missions/${id}`);

export const getActivity = (id: string) =>
  request<ActivityEvent[]>(`/missions/${id}/activity`);

/** Choose a product for one requirement. This is both Keep and Swap - one
 *  operation, because "this is my choice for this requirement" is one idea. */
export const selectProduct = (id: string, requirementId: string, productId: string) =>
  request<Basket>(`/missions/${id}/selections`, {
    method: "POST",
    body: JSON.stringify({ requirement_id: requirementId, product_id: productId }),
  });

/** Accept the basket. Moves the mission to BASKET_READY. Buys nothing. */
export const approveBasket = (id: string) =>
  request<Basket>(`/missions/${id}/approve`, { method: "POST" });

export const startRun = (id: string) =>
  request<RunAck>(`/missions/${id}/run`, { method: "POST" });

export const answerQuestions = (
  id: string,
  answers: { location?: string; budget_amount?: number; budget_currency?: string },
) =>
  request<Mission>(`/missions/${id}/answers`, {
    method: "POST",
    body: JSON.stringify(answers),
  });

/**
 * The basket, or null when there is not one yet.
 *
 * The backend answers 409 while a mission has not reached the point of having a
 * basket. That is not a failure - it is the normal state of a mission that is
 * still searching - so it becomes null here rather than an exception. Only a
 * genuine error gets thrown, which keeps the "is something broken" check in the
 * component honest.
 */
export async function getBasket(id: string): Promise<Basket | null> {
  try {
    return await request<Basket>(`/missions/${id}/basket`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null;
    throw error;
  }
}

/* ---------------------------------------------------------------- helpers */

/** "47.00" + "CAD" -> "$47.00". Falls back to the code for currencies the
 *  browser has no symbol for, which is better than showing a bare number. */
export function money(amount: Money | null | undefined, currency = "CAD"): string {
  if (amount === null || amount === undefined) return "—";
  const value = Number(amount);
  if (Number.isNaN(value)) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Money as a plain number, for arithmetic and bar widths only - never for
 *  anything the customer is shown as a figure. */
export const amount = (value: Money | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value) || 0;

/**
 * Is the workflow still doing something?
 *
 * True while the mission is moving through the agents. False once it has a
 * basket, or once it is waiting on an answer - in both of those cases nothing
 * will change until somebody acts, so there is nothing to wait for.
 */
export function isWorking(mission: Mission, basket: Basket | null): boolean {
  if (mission.pending_questions.length > 0) return false;
  if (mission.status === "review") return basket === null;
  return ["draft", "planning", "searching", "evaluating"].includes(mission.status);
}

/** What the agents are doing right now, in words, derived from real state.
 *  Nothing here is invented - each line is just the current phase named. */
export function currentActivity(mission: Mission, basket: Basket | null): string | null {
  if (mission.pending_questions.length > 0) return null;
  switch (mission.status) {
    case "draft":
      return "Starting your mission";
    case "planning":
      return "Building your shopping plan";
    case "searching":
      return "Searching available catalogues";
    case "evaluating":
      return "Comparing and ranking products";
    case "review":
      return basket ? null : "Building your basket";
    default:
      return null;
  }
}
