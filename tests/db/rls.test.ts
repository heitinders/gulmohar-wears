// Real-database checks for the Find Your Fit schema: a throwaway Postgres cluster with a Supabase-shaped
// auth stub, then the migration, then every role tries what it should and should not be able to do.
// Run with `npm run test:db`. Skips when Postgres binaries are not installed.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const has = (bin: string) => { try { execFileSync("which", [bin], { stdio: "ignore" }); return true; } catch { return false; } };
const available = has("initdb") && has("postgres") && has("psql");

const STAFF = "11111111-1111-1111-1111-111111111111";
const OUTSIDER = "22222222-2222-2222-2222-222222222222";
let dir = ""; let port = 0; let server: ChildProcess | null = null;

const freePort = () => new Promise<number>(resolve => { const s = createServer(); s.listen(0, () => { const p = (s.address() as { port: number }).port; s.close(() => resolve(p)); }); });
/** Runs SQL as the cluster superuser; `as` switches role and JWT subject the way PostgREST does. */
function sql(query: string, as?: { role: "anon" | "authenticated" | "service_role"; sub?: string }): string {
  const prefix = as ? `set role ${as.role}; set request.jwt.claim.sub = '${as.sub ?? ""}';\n` : "";
  return execFileSync("psql", ["-h", dir, "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-q", "-c", prefix + query], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
const fails = (query: string, as: Parameters<typeof sql>[1], pattern: RegExp) => assert.throws(() => sql(query, as), (e: Error & { stderr?: string }) => pattern.test(String(e.stderr ?? e.message)));

before(async () => {
  if (!available) return;
  dir = mkdtempSync(join(tmpdir(), "gw-rls-")); port = await freePort();
  execFileSync("initdb", ["-D", join(dir, "data"), "-U", "postgres", "--auth=trust", "-E", "UTF8"], { stdio: "ignore" });
  server = spawn("postgres", ["-D", join(dir, "data"), "-p", String(port), "-k", dir, "-c", "listen_addresses="], { stdio: "ignore" });
  for (let i = 0; i < 100; i++) { try { execFileSync("pg_isready", ["-h", dir, "-p", String(port)], { stdio: "ignore" }); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  const run = (file: string) => execFileSync("psql", ["-h", dir, "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { stdio: ["ignore", "ignore", "pipe"] });
  run(join(root, "supabase/tests/auth-stub.sql"));
  for (const f of readdirSync(join(root, "supabase/migrations")).sort()) run(join(root, "supabase/migrations", f));
  sql(`insert into auth.users (id, email) values ('${STAFF}', 'staff@example.com'), ('${OUTSIDER}', 'someone@example.com');
       insert into studio_staff (user_id, email) values ('${STAFF}', 'staff@example.com');`);
});
after(() => { server?.kill("SIGINT"); if (dir) rmSync(dir, { recursive: true, force: true }); });

const seedClient = () => sql(`insert into fit_clients (phone_e164, name, consent_at, consent_version) values ('+919876543210', 'Simran', now(), 'fit-consent-2026-10-02') on conflict (phone_e164) do update set name = excluded.name returning id`, { role: "service_role" });

test("service role writes clients and the checks hold", { skip: !available && "Postgres not installed" }, () => {
  assert.match(seedClient(), /^[0-9a-f-]{36}$/);
  fails(`insert into fit_clients (phone_e164, name, consent_at, consent_version) values ('+0123', 'A', now(), 'v')`, { role: "service_role" }, /check/);
  fails(`insert into fit_clients (phone_e164, name, consent_at, consent_version) values ('9876543210', 'A', now(), 'v')`, { role: "service_role" }, /check/);
  fails(`insert into fit_clients (phone_e164, name, consent_at, consent_version) values ('+447911123456', '', now(), 'v')`, { role: "service_role" }, /check/);
  fails(`update fit_clients set brief = '{"notes":"x"}' where phone_e164 = '+919876543210'`, { role: "service_role" }, /check/);
  fails(`update fit_clients set style = 'saree' where phone_e164 = '+919876543210'`, { role: "service_role" }, /check/);
  sql(`update fit_clients set brief = '{"city":"Leeds"}', fit = 'relaxed' where phone_e164 = '+919876543210'`, { role: "service_role" });
  assert.equal(sql(`select brief->>'city' from fit_clients where phone_e164 = '+919876543210'`), "Leeds");
});

test("updated_at moves on update", { skip: !available && "Postgres not installed" }, () => {
  seedClient();
  sql(`update fit_clients set updated_at = now() - interval '1 day' where phone_e164 = '+919876543210'`);
  sql(`update fit_clients set fit = 'fitted' where phone_e164 = '+919876543210'`, { role: "service_role" });
  assert.equal(sql(`select updated_at > now() - interval '1 minute' from fit_clients where phone_e164 = '+919876543210'`), "t");
});

test("anon can neither read nor write any table", { skip: !available && "Postgres not installed" }, () => {
  seedClient();
  for (const t of ["fit_clients", "fit_usage", "studio_staff"]) {
    let rows = "0";
    try { rows = sql(`select count(*) from ${t}`, { role: "anon" }); } catch { rows = "0"; }
    assert.equal(rows, "0", `anon read ${t}`);
  }
  assert.throws(() => sql(`insert into fit_clients (phone_e164, name, consent_at, consent_version) values ('+447911123456', 'A', now(), 'v')`, { role: "anon" }));
  assert.throws(() => sql(`insert into fit_usage (phone_e164, day) values ('+447911123456', current_date)`, { role: "anon" }));
});

test("a signed-in user who is not staff sees and deletes nothing", { skip: !available && "Postgres not installed" }, () => {
  seedClient();
  assert.equal(sql(`select count(*) from fit_clients`, { role: "authenticated", sub: OUTSIDER }), "0");
  assert.equal(sql(`with d as (delete from fit_clients returning 1) select count(*) from d`, { role: "authenticated", sub: OUTSIDER }), "0");
  assert.equal(sql(`select count(*) from studio_staff`, { role: "authenticated", sub: OUTSIDER }), "0");
  assert.equal(sql(`select count(*) from fit_clients`), "1");
});

test("staff read clients and usage, delete clients, but cannot write them", { skip: !available && "Postgres not installed" }, () => {
  seedClient();
  sql(`select fit_bump_usage('+919876543210', current_date, 'tryons')`, { role: "service_role" });
  assert.equal(sql(`select count(*) from fit_clients`, { role: "authenticated", sub: STAFF }), "1");
  assert.equal(sql(`select count(*) from fit_usage`, { role: "authenticated", sub: STAFF }), "1");
  assert.equal(sql(`select email from studio_staff`, { role: "authenticated", sub: STAFF }), "staff@example.com");
  let updated = "0";
  try { updated = sql(`with u as (update fit_clients set name = 'X' returning 1) select count(*) from u`, { role: "authenticated", sub: STAFF }); } catch { updated = "0"; }
  assert.equal(updated, "0");
  assert.equal(sql(`select name from fit_clients`), "Simran");
  assert.throws(() => sql(`insert into fit_clients (phone_e164, name, consent_at, consent_version) values ('+447911123456', 'A', now(), 'v')`, { role: "authenticated", sub: STAFF }));
  assert.throws(() => sql(`insert into studio_staff (user_id, email) values ('${OUTSIDER}', 'x')`, { role: "authenticated", sub: STAFF }));
  assert.equal(sql(`with d as (delete from fit_clients returning 1) select count(*) from d`, { role: "authenticated", sub: STAFF }), "1");
});

test("fit_bump_usage counts atomically and only the service role may call it", { skip: !available && "Postgres not installed" }, () => {
  assert.equal(sql(`select fit_bump_usage('+447911123456', '2026-10-03', 'tryons')`, { role: "service_role" }), "1");
  assert.equal(sql(`select fit_bump_usage('+447911123456', '2026-10-03', 'tryons')`, { role: "service_role" }), "2");
  assert.equal(sql(`select fit_bump_usage('+447911123456', '2026-10-03', 'reports')`, { role: "service_role" }), "1");
  assert.equal(sql(`select tryons || '/' || reports from fit_usage where phone_e164 = '+447911123456' and day = '2026-10-03'`), "2/1");
  fails(`select fit_bump_usage('+447911123456', '2026-10-03', 'everything')`, { role: "service_role" }, /field/);
  fails(`select fit_bump_usage('+447911123456', '2026-10-03', 'tryons')`, { role: "anon" }, /permission denied/);
  fails(`select fit_bump_usage('+447911123456', '2026-10-03', 'tryons')`, { role: "authenticated", sub: STAFF }, /permission denied/);
});

test("no table has a column for measurements, body data or images", { skip: !available && "Postgres not installed" }, () => {
  const cols = sql(`select column_name from information_schema.columns where table_schema = 'public' and table_name in ('fit_clients','fit_usage','studio_staff')`).split("\n");
  for (const c of cols) assert.doesNotMatch(c, /measure|height|weight|age$|image|photo|bust|waist|hip/, c);
  assert.ok(cols.includes("phone_e164"));
});

test("migration file is idempotent-safe to read and names the consent-free tables only", { skip: !available && "Postgres not installed" }, () => {
  const text = readdirSync(join(root, "supabase/migrations")).map(f => readFileSync(join(root, "supabase/migrations", f), "utf8")).join("\n");
  assert.match(text, /enable row level security/gi);
  assert.equal((text.match(/enable row level security/gi) ?? []).length, 3);
});

test("fit_reserve_tryon stops at the cap, refund gives one back, and only the service role may call them", { skip: !available && "Postgres not installed" }, () => {
  const r = (q: string) => sql(q, { role: "service_role" });
  assert.equal(r(`select fit_reserve_tryon('+447400999999', '2026-10-03', 2)`), "t");
  assert.equal(r(`select fit_reserve_tryon('+447400999999', '2026-10-03', 2)`), "t");
  assert.equal(r(`select fit_reserve_tryon('+447400999999', '2026-10-03', 2)`), "f");
  assert.equal(sql(`select tryons from fit_usage where phone_e164 = '+447400999999'`), "2");
  r(`select fit_refund_tryon('+447400999999', '2026-10-03')`); r(`select fit_refund_tryon('+447400999999', '2026-10-03')`); r(`select fit_refund_tryon('+447400999999', '2026-10-03')`);
  assert.equal(sql(`select tryons from fit_usage where phone_e164 = '+447400999999'`), "0");
  assert.equal(r(`select fit_reserve_tryon('+447400888888', '2026-10-03', 0)`), "f");
  fails(`select fit_reserve_tryon('x', '2026-10-03', 5)`, { role: "anon" }, /permission denied/);
  fails(`select fit_refund_tryon('x', '2026-10-03')`, { role: "authenticated", sub: STAFF }, /permission denied/);
});

test("parallel reservations never pass the cap", { skip: !available && "Postgres not installed" }, async () => {
  const { exec } = await import("node:child_process");
  const one = () => new Promise<string>(resolve => exec(`psql -h ${dir} -p ${port} -U postgres -d postgres -At -q -c "set role service_role; select fit_reserve_tryon('+447400777777', '2026-10-03', 3)"`, (_e, out) => resolve(out.trim())));
  const results = await Promise.all(Array.from({ length: 12 }, one));
  assert.equal(results.filter(x => x === "t").length, 3);
  assert.equal(sql(`select tryons from fit_usage where phone_e164 = '+447400777777'`), "3");
});

test("deleting a client also deletes their usage rows, leaving other phones alone", { skip: !available && "Postgres not installed" }, () => {
  seedClient();
  sql(`select fit_bump_usage('+919876543210', '2026-10-01', 'tryons'); select fit_bump_usage('+919876543210', '2026-10-02', 'reports'); select fit_bump_usage('+447400666666', '2026-10-02', 'tryons')`, { role: "service_role" });
  assert.equal(sql(`with d as (delete from fit_clients where phone_e164 = '+919876543210' returning 1) select count(*) from d`, { role: "authenticated", sub: STAFF }), "1");
  assert.equal(sql(`select count(*) from fit_usage where phone_e164 = '+919876543210'`), "0");
  assert.equal(sql(`select count(*) from fit_usage where phone_e164 = '+447400666666'`), "1");
});
