// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const ids = ['owner','admin','member','guest','outsider'].reduce((a,n,i)=>({...a,[n]:`00000000-0000-0000-0000-00000000000${i+1}`}),{});
const ws='10000000-0000-0000-0000-000000000001';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY);
CREATE TABLE public.workspaces(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles(id),name text);
CREATE TABLE public.workspace_members(workspace_id uuid REFERENCES workspaces(id),user_id uuid REFERENCES profiles(id),role text,PRIMARY KEY(workspace_id,user_id));
CREATE TABLE public.projects(id uuid PRIMARY KEY,workspace_id uuid REFERENCES workspaces(id),name text);
INSERT INTO profiles VALUES ${Object.values(ids).map(id=>`('${id}')`).join(',')};
INSERT INTO workspaces VALUES ('${ws}','${ids.owner}','Test');
INSERT INTO workspace_members VALUES ('${ws}','${ids.owner}','owner'),('${ws}','${ids.admin}','admin'),('${ws}','${ids.member}','member'),('${ws}','${ids.guest}','guest');
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,anon;
CREATE POLICY legacy_open ON workspaces FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY legacy_open ON workspace_members FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY legacy_open ON projects FOR ALL USING(true) WITH CHECK(true);`);
const sql=readFileSync('supabase/sql/workspace_roles.sql','utf8');
await db.exec(sql);
await db.exec(sql); // Repeat-safe, preserving customizations.
async function as(user,query) {
 await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${ids[user]}',false); SET ROLE authenticated;`);
 return db.query(query);
}
async function denied(user,query) { let failed=false; try { const r=await as(user,query); failed=r.affectedRows===0; } catch { failed=true; } assert(failed,`${user} unexpectedly allowed: ${query}`); }
assert.equal((await as('owner',`SELECT * FROM workspace_roles`)).rows.length,5);
assert.equal((await as('outsider',`SELECT * FROM workspace_roles`)).rows.length,0);
await denied('member',`INSERT INTO workspace_roles VALUES('${ws}','bad','Bad','admin','[]','[]')`);
await denied('guest',`UPDATE workspace_role_assignments SET role_key='super_admin' WHERE user_id='${ids.guest}'`);
await as('admin',`INSERT INTO workspace_roles VALUES('${ws}','custom_test','Reviewer','member','["projects"]','["comment:create"]')`);
await as('admin',`UPDATE workspace_roles SET name='Reviewer updated' WHERE role_key='custom_test'`);
await as('owner',`UPDATE workspace_role_assignments SET role_key='custom_test' WHERE user_id='${ids.member}'`);
assert.equal((await as('member',`SELECT private.workspace_access('${ws}','project:create') AS allowed`)).rows[0].allowed,false);
await denied('member',`INSERT INTO projects VALUES('20000000-0000-0000-0000-000000000001','${ws}','Forbidden')`);
await as('owner',`INSERT INTO projects VALUES('20000000-0000-0000-0000-000000000002','${ws}','Allowed')`);
await denied('admin',`UPDATE workspace_role_assignments SET role_key='guest' WHERE user_id='${ids.owner}'`);
await denied('admin',`UPDATE workspace_role_assignments SET role_key='guest' WHERE user_id='${ids.admin}'`);
await denied('admin',`UPDATE workspaces SET owner_id='${ids.admin}' WHERE id='${ws}'`);
await denied('admin',`DELETE FROM workspace_members WHERE user_id='${ids.owner}'`);
await db.exec('RESET ROLE; SET ROLE anon;');
await assert.rejects(db.query('SELECT * FROM workspace_roles'));
await db.exec('RESET ROLE');
await db.exec(`INSERT INTO workspaces VALUES('10000000-0000-0000-0000-000000000002','${ids.outsider}','New');`);
assert.equal((await as('outsider',`SELECT * FROM workspace_roles`)).rows.length,5);
console.log('PASS: role defaults, repeat execution, custom roles, assignment, tenant isolation, guest/member denials, owner protection, anonymous denial, new workspace initialization.');
await db.close();
