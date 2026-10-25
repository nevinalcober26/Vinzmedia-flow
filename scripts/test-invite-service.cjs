const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/services/inviteService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function service(client){const exports={};vm.runInNewContext(code,{exports,console,crypto:require('node:crypto').webcrypto,window:{location:{origin:'https://app.example.com'}},require:id=>id==='@/lib/supabase'?{supabase:client}:require(id)});return exports.inviteService;}
(async()=>{
 const denied=service({rpc:async()=>({error:{message:'Denied'}}),from:()=>({insert:async()=>({error:{message:'Denied'}})})});
 assert.equal(await denied.approveUser({id:'person'},'workspace'),false);
 assert.equal(await denied.rejectUser('person','workspace'),false);
 await assert.rejects(denied.createInvite('workspace','new@example.com'));
 await assert.rejects(denied.getInviteByToken('fake'));
 const invalid=service({rpc:async()=>({data:null})});
 assert.equal((await invalid.submitRegistration('fake','Name','name','new@example.com','secret')).success,false);
 let lookups=0,signupData, signedOut=false;
 const registration=service({rpc:async()=>({data:++lookups===1?{email:'new@example.com'}:null}),auth:{getUser:async()=>({data:{user:null}}),signUp:async(args)=>{signupData=args;return {data:{user:{id:'person',identities:[{}]}}};},signOut:async()=>{signedOut=true;}}});
 assert.equal((await registration.submitRegistration('valid','Name','name','new@example.com','secret')).success,true);
 assert.equal(signupData.options.data.invite_token,'valid');
 assert.equal(signupData.options.data.role,undefined);
 assert(signedOut);
 const signupError=service({rpc:async()=>({data:{email:''}}),auth:{getUser:async()=>({data:{user:null}}),signUp:async()=>({error:{message:'Signup failed'}})}});
 assert.equal((await signupError.submitRegistration('valid','Name','name','new@example.com','secret')).success,false);
 console.log('PASS: approval/rejection failures propagate, invitation failure cannot report success, invalid tokens fail, signup queues via token without role claims, signup errors fail closed.');
})();
