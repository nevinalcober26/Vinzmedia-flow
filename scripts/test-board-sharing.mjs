import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const modulePath = process.env.PGLITE_MODULE || "@electric-sql/pglite";
const { PGlite } = await import(modulePath);
const { pgcrypto } = await import(
  process.env.PGLITE_CRYPTO_MODULE || "@electric-sql/pglite/contrib/pgcrypto"
);
const db = new PGlite({ extensions: { pgcrypto } });
const owner = "00000000-0000-0000-0000-000000000001",
  admin = "00000000-0000-0000-0000-000000000002",
  member = "00000000-0000-0000-0000-000000000003";
const ws = "10000000-0000-0000-0000-000000000001",
  other = "10000000-0000-0000-0000-000000000002",
  project = "20000000-0000-0000-0000-000000000001";
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE profiles(id uuid PRIMARY KEY);
CREATE TABLE workspaces(id uuid PRIMARY KEY,owner_id uuid,name text);
CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,PRIMARY KEY(workspace_id,user_id));
CREATE TABLE projects(id uuid PRIMARY KEY,workspace_id uuid,name text);
CREATE TABLE tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,workspace_id uuid,title text,status text,due_date date,order_index int DEFAULT 0,created_at timestamptz DEFAULT now(),description text);
INSERT INTO profiles VALUES('${owner}'),('${admin}'),('${member}');
INSERT INTO workspaces VALUES('${ws}','${owner}','Main'),('${other}','${member}','Other');
INSERT INTO workspace_members VALUES('${ws}','${admin}','admin'),('${ws}','${member}','member');
INSERT INTO projects VALUES('${project}','${ws}','Client project');
INSERT INTO tasks(project_id,workspace_id,title,status,description) VALUES('${project}','${ws}','Visible task','in_progress','PRIVATE'),('${project}','${other}','Mismatched tenant','done','PRIVATE');`);
await db.exec(readFileSync("supabase/sql/workspace_roles.sql", "utf8"));
const sql = readFileSync("supabase/sql/project_board_sharing.sql", "utf8");
await db.exec(sql);
await db.exec(sql);
async function user(id) {
  await db.exec(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`,
  );
}
async function manage(op, password = null) {
  return (
    await db.query("select manage_project_board_share($1,$2,$3) as result", [
      project,
      op,
      password,
    ])
  ).rows[0].result;
}
async function read(token, password = null) {
  await db.exec("RESET ROLE;SET ROLE anon;");
  return (
    await db.query("select read_shared_project_board($1,$2) as result", [
      token,
      password,
    ])
  ).rows[0].result;
}
await user(member);
await assert.rejects(manage("public"));
await user(owner);
const first = await manage("public");
let board = await read(first.token);
assert.equal(board.state, "ready");
assert.equal(board.tasks.length, 1);
assert.equal(board.tasks[0].title, "Visible task");
assert(!JSON.stringify(board).includes("PRIVATE"));
await assert.rejects(db.query("select * from private.project_board_shares"));
await assert.rejects(manage("public"));
await user(admin);
await assert.rejects(manage("password", "short"));
const locked = await manage("password", "client-secure-password");
assert.equal((await read(first.token)).state, "unavailable");
assert.deepEqual(await read(locked.token), { state: "password" });
assert.deepEqual(await read(locked.token, "wrong"), { state: "incorrect" });
assert.equal(
  (await read(locked.token, "client-secure-password")).state,
  "ready",
);
for (let i = 0; i < 18; i++) await read(locked.token, "wrong");
assert.equal((await read(locked.token, "wrong")).state, "limited");
await user(owner);
await manage("disable");
assert.equal(
  (await read(locked.token, "client-secure-password")).state,
  "unavailable",
);
await user(owner);
const renewed = await manage("public");
assert.notEqual(renewed.token, locked.token);
assert.equal((await read(renewed.token)).state, "ready");
console.log(
  "PASS: owner/admin management, member and anonymous denial, scoped public projection, hidden private data, password checks, throttling, token rotation, disable and repeat-safe SQL.",
);
await db.close();
