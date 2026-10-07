import type { ClientRow } from "./server/store.ts";
import type { BriefRow } from "./preference-sync.ts";

const hasBrief = (b: BriefRow | null) => !!b && Object.values(b).some(v => typeof v === "string" && v.trim());

/** Studio Orders: clients with any order brief, soonest deadline first, undated briefs last (spec 4.1). */
export function listOrders(rows: ClientRow[]): ClientRow[] {
  return rows.filter(r => hasBrief(r.brief)).sort((a, b) => {
    const x = a.brief?.deadline ?? ""; const y = b.brief?.deadline ?? "";
    if (!x !== !y) return x ? -1 : 1;
    return x.localeCompare(y);
  });
}

export const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

const day = (iso: string) => new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

export function briefSummary(b: BriefRow | null): string {
  if (!b) return "";
  return [b.occasion, b.fabric, b.city, b.deadline ? `by ${day(b.deadline)}` : ""].filter(Boolean).join(", ");
}
