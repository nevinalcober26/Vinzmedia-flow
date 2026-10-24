const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
(async () => {
 for (const [file,service,method] of [['projectService','projectService','getProjects'],['taskService','taskService','getTasks'],['clientService','clientService','getClients']]) {
  const calls=[];
  const client={from(table){const filters=[];const query={select(){return query;},eq(...args){filters.push(args);return query;},order(){return query;},then(resolve){calls.push({table,filters});return Promise.resolve({data:[],error:null}).then(resolve);}};return query;}};
  const code=ts.transpileModule(fs.readFileSync(`src/lib/services/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};vm.runInNewContext(code,{exports,console,require:(id)=>id==='@/lib/supabase'?{supabase:client,isSupabaseConfigured:true}:require(id)});
  const result=await exports[service][method]('new-empty-workspace');
  assert.equal(result.length,0);assert.equal(calls.length,1,'An empty workspace must not trigger an unscoped fallback query');
  assert.equal(calls[0].filters[0][0],'workspace_id');assert.equal(calls[0].filters[0][1],'new-empty-workspace');
 }
 console.log('PASS: empty projects, tasks and clients remain empty and never fall back to another workspace.');
})();
