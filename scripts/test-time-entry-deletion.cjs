const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/services/timeEntryService.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function run({user='u1',authError=null,results=[],throws=false}) {
 const calls=[];
 const client={auth:{getUser:async()=>({data:{user:user ? {id:user}:null},error:authError})},from:()=>{
  const chain={};for(const op of ['delete','select','eq']) chain[op]=(...args)=>{calls.push([op,...args]);return chain;};
  chain.maybeSingle=async()=>{if(throws)throw Error('offline');return results.shift();};return chain;
 }};
 const exports={};vm.runInNewContext(code,{exports,console,require:(id)=>id==='@/lib/supabase'?{supabase:client,isSupabaseConfigured:true}:require(id)});
 const result=await exports.timeEntryService.deleteTimeEntry({id:'entry',workspace_id:'ws',user_id:'u1'});
 return {result,calls};
}
(async()=>{
 assert.equal((await run({results:[{data:{id:'entry'},error:null}]})).result.success,true);
 const stale=await run({results:[{data:null,error:null},{data:null,error:null}]});assert.equal(stale.result.success,true);
 const denied=await run({results:[{data:null,error:null},{data:{id:'entry'},error:null}]});assert.equal(denied.result.success,false);assert.match(denied.result.error,/still in Supabase/);
 assert.equal((await run({results:[{data:null,error:{message:'permission denied'}}]})).result.success,false);
 assert.equal((await run({results:[{data:null,error:null},{data:null,error:{message:'network'}}]})).result.success,false);
 for(const user of [null,'other']){const r=await run({user});assert.equal(r.result.success,false);assert.equal(r.calls.length,0);}
 assert.equal((await run({throws:true})).result.success,false);
 assert(stale.calls.some(c=>c[0]==='eq'&&c[1]==='workspace_id'&&c[2]==='ws'));
 console.log('PASS: deletion, cached-only entry, silent policy rejection, explicit denial, failed read, expired login, wrong owner, network failure, workspace scoping.');
})();
