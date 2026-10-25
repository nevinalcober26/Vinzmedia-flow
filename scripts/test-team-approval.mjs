import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ws = id(100),
  other = id(101);
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
CREATE TABLE profiles(id uuid PRIMARY KEY,email text,full_name text,username text,role text,status text,approval_status text);
CREATE TABLE workspaces(id uuid PRIMARY KEY,owner_id uuid,name text);
CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,PRIMARY KEY(workspace_id,user_id));
CREATE TABLE workspace_invites(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid,email text,token text UNIQUE,role text,status text DEFAULT 'pending',expires_at timestamptz DEFAULT now()+interval '7 days',created_at timestamptz DEFAULT now());
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
INSERT INTO profiles VALUES('${id(1)}','owner@test.com','Owner',null,'owner','online','approved'),('${id(2)}','admin@test.com','Admin',null,'admin','online','approved'),('${id(3)}','member@test.com','Member',null,'member','online','approved');
INSERT INTO workspaces VALUES('${ws}','${id(1)}','Main'),('${other}','${id(3)}','Other');
INSERT INTO workspace_members VALUES('${ws}','${id(1)}','owner'),('${ws}','${id(2)}','admin'),('${ws}','${id(3)}','member');
GRANT ALL ON profiles,workspace_members TO authenticated;
CREATE POLICY legacy_open ON workspace_members FOR ALL USING(true) WITH CHECK(true);`);
await db.exec(readFileSync("supabase/sql/workspace_roles.sql", "utf8"));
const sql = readFileSync("supabase/sql/team_approval_required.sql", "utf8");
await db.exec(sql);
await db.exec(sql);
async function as(n) {
  await db.exec(
    `RESET ROLE;SELECT set_config('request.jwt.claim.sub','${id(n)}',false);SET ROLE authenticated;`,
  );
}
async function root() {
  await db.exec("RESET ROLE");
}
async function signup(n, role) {
  await root();
  await db.query(
    `INSERT INTO workspace_invites(workspace_id,email,token,role) VALUES($1,$2,$3,$4)`,
    [ws, `new${n}@test.com`, `token-${n}`, role],
  );
  await db.query(`INSERT INTO auth.users VALUES($1,$2,$3)`, [
    id(n),
    `new${n}@test.com`,
    JSON.stringify({
      full_name: `Person ${n}`,
      invite_token: `token-${n}`,
      role: "owner",
      approval_status: "approved",
    }),
  ]);
}
for (const [i, role] of [
  "admin",
  "project_manager",
  "member",
  "guest",
].entries()) {
  const n = i + 10;
  await signup(n, role);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM workspace_members WHERE user_id=$1",
        [id(n)],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query("SELECT approval_status FROM profiles WHERE id=$1", [
        id(n),
      ])
    ).rows[0].approval_status,
    "pending",
  );
  await as(n);
  await assert.rejects(
    db.query(`UPDATE profiles SET approval_status='approved' WHERE id=$1`, [
      id(n),
    ]),
  );
  await assert.rejects(
    db.query(`SELECT review_workspace_join($1,$2,true)`, [ws, id(n)]),
  );
  await as(3);
  await assert.rejects(
    db.query(`SELECT review_workspace_join($1,$2,true)`, [ws, id(n)]),
  );
  await as(1);
  await assert.rejects(
    db.query(`INSERT INTO workspace_members VALUES($1,$2,$3)`, [
      ws,
      id(n),
      role,
    ]),
  );
  await as(2);
  await db.query("SELECT review_workspace_join($1,$2,true)", [ws, id(n)]);
  await root();
  assert.equal(
    (
      await db.query(
        "SELECT role_key FROM workspace_role_assignments WHERE workspace_id=$1 AND user_id=$2",
        [ws, id(n)],
      )
    ).rows[0].role_key,
    role === "admin" ? "super_admin" : role,
  );
}
await signup(20, "member");
await as(2);
await db.query("SELECT review_workspace_join($1,$2,false)", [ws, id(20)]);
await root();
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int n FROM workspace_members WHERE user_id=$1",
      [id(20)],
    )
  ).rows[0].n,
  0,
);
await assert.rejects(
  db.query(
    `INSERT INTO auth.users VALUES($1,'wrong@test.com','{"invite_token":"invalid"}')`,
    [id(21)],
  ),
);
await db.query(
  `INSERT INTO auth.users VALUES($1,'newworkspace@test.com','{"role":"owner"}')`,
  [id(22)],
);
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int n FROM workspace_members WHERE user_id=$1",
      [id(22)],
    )
  ).rows[0].n,
  0,
);
await as(3);
assert.equal(
  (await db.query("SELECT pending_workspace_joins($1) result", [ws])).rows[0]
    .result.length,
  0,
);
await root();
await db.exec("SET ROLE anon");
await assert.rejects(db.query("SELECT * FROM workspace_invites"));
await assert.rejects(
  db.query("SELECT review_workspace_join($1,$2,true)", [ws, id(20)]),
);
console.log(
  "PASS: every invited role remains pending, metadata cannot grant access, direct enrollment and self-approval denied, admin approval assigns invited role, rejection blocks enrollment, invalid tokens fail, signup never joins an existing workspace, anonymous/member review denied.",
);
await db.close();
