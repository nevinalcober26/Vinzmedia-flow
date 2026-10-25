const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/lib/services/authService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function login(status){
 let signedOut=false;
 const client={auth:{signInWithPassword:async()=>({data:{user:{id:'person'}}}),signOut:async()=>{signedOut=true;}},from:()=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:status===null?null:{id:'person',email:'person@example.com',role:'member',approval_status:status}})};return q;}};
 const exports={};vm.runInNewContext(code,{exports,console,require:id=>id==='@/lib/supabase'?{supabase:client,isSupabaseConfigured:true}:require(id)});
 return {result:await exports.authService.signIn('person@example.com','password'),signedOut};
}
(async()=>{
 for(const status of ['pending','rejected',null]){const {result,signedOut}=await login(status);assert.equal(result.user,null);assert(result.error);assert(signedOut);}
 const approved=await login('approved');assert.equal(approved.result.user.id,'person');assert.equal(approved.result.error,null);assert.equal(approved.signedOut,false);
 console.log('PASS: pending/rejected/missing profiles cannot log in and sessions are closed; approved members can log in.');
})();
