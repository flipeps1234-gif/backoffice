import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports, env = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../../'+file,import.meta.url),'utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: id => {
      if (!(id in imports)) throw new Error(`Unstubbed import: ${id}`);
      return imports[id];
    },
    process:{env:{NODE_ENV:'production',...env}},
    Request,Response,File,FormData,Buffer,AbortSignal,Date,
    console:{error(){},warn(){},log(){}},...globals,
  });
  return exports;
}
const id='22222222-2222-4222-8222-222222222222';
const lease='44444444-4444-4444-8444-444444444444';
function extraction(options = {}) {
  const calls={provider:[],reserve:[],finish:[]};
  const imports={
    '@/lib/extract': {
      activeProviderName:()=>options.provider??'openai',
      extract:async (...args)=>{calls.provider.push(args);if(options.providerError)throw Error('provider failed');return {transactions:[],warnings:[]};},
    },
    '@/lib/extract/image-types':{IMAGE_TYPES:new Set(['image/png'])},
    '@/lib/extract/today':{resolveToday:()=> '2026-09-04'},
    '@/lib/supabase/server':{
      isSupabaseConfigured:options.configured??true,
      isDemoAccount:()=>options.demo??false,
      verifyAccessToken:async token=>token==='valid'?{accountId:id,email:'local@example.invalid'}:null,
    },
    '@/lib/supabase/security':{
      reserveExtraction:async (...args)=>{calls.reserve.push(args);if(options.quotaError)throw Error('quota offline');return options.reserve?options.reserve(...args):{allowed:true,reservation_id:lease};},
      finishExtraction:async value=>{calls.finish.push(value);},
    },
  };
  return {calls,newInstance:()=>load('src/app/api/extract/route.ts',imports,options.env).POST};
}
function upload(token='valid',ip='192.0.2.1',count=1) {
  const body=new FormData();
  for(let i=0;i<count;i++)body.append('screenshots',new File(['test'],`image-${i}.png`,{type:'image/png'}));
  // Caller-supplied identity must never become the quota subject.
  body.append('account_id','attacker-chosen-id');
  return new Request('http://local.test/api/extract',{method:'POST',headers:{authorization:`Bearer ${token}`,'cf-connecting-ip':ip},body});
}

test('missing and invalid auth reject before parsing or reserving',async()=>{
  const {newInstance,calls}=extraction();
  const post=newInstance();
  const request={headers:new Headers(),formData(){throw Error('body parsed');}};
  assert.equal((await post(request)).status,401);
  assert.equal((await post(upload('invalid'))).status,401);
  assert.equal(calls.reserve.length,0);
  assert.equal(calls.provider.length,0);
});
test('all instances and IPs reserve under the same verified account',async()=>{
  let accepted=0;
  const {newInstance,calls}=extraction({reserve:()=>++accepted<=2?{allowed:true,reservation_id:lease}:{allowed:false,retry_after:120}});
  for(let i=0;i<3;i++){
    const r=await newInstance()(upload('valid',`192.0.2.${i+1}`,2));
    assert.equal(r.status,i===2?429:200);
    if(i===2)assert.equal(r.headers.get('retry-after'),'120');
  }
  assert.equal(calls.provider.length,2);
  assert.equal(calls.finish.length,2);
  for(const args of calls.reserve){assert.equal(args[0],id);assert.equal(args[1],2);}
});
test('quota outage fails closed and malformed uploads do not reserve',async()=>{
  const {newInstance,calls}=extraction({quotaError:true});
  const post=newInstance();
  assert.equal((await post(upload())).status,503);
  assert.equal(calls.provider.length,0);
  assert.equal(calls.finish.length,0);
  assert.equal((await post(upload('valid','192.0.2.2',0))).status,400);
  assert.equal(calls.reserve.length,1);
});
test('provider failure releases concurrency but does not request any refund',async()=>{
  const {newInstance,calls}=extraction({providerError:true});
  assert.equal((await newInstance()(upload())).status,502);
  assert.equal(calls.finish[0],lease);
  assert.equal(calls.reserve.length,1);
});
test('real demo reserves; explicit demo mock is free; real users never receive mock',async()=>{
  const real=extraction({demo:true});
  assert.equal((await real.newInstance()(upload())).status,200);
  assert.equal(real.calls.reserve.length,1);
  const mock=extraction({demo:true,env:{DEMO_EXTRACTION:'mock'}});
  assert.equal((await mock.newInstance()(upload())).status,200);
  assert.equal(mock.calls.reserve.length,0);
  assert.equal(mock.calls.provider[0][2],'mock');
  const user=extraction({provider:'mock'});
  assert.equal((await user.newInstance()(upload())).status,503);
  assert.equal(user.calls.provider.length,0);
  const missing=extraction({configured:false});
  assert.equal((await missing.newInstance()(upload())).status,503);
});

function founding(result={data:true,error:null},configured=true){
  const calls=[];
  const route=load('src/app/api/founding/route.ts',{
    '@/lib/supabase/security':{
      securityClient:()=>configured?{rpc:async(name,params)=>{calls.push({name,params});if(result instanceof Error)throw result;return result;}}:null,
      signupIpHash:()=> 'a'.repeat(64),
    },
  });
  const post=email=>route.POST(new Request('http://local.test/api/founding',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify({email})}));
  return {calls,post};
}
test('signup uses only the protected RPC with normalized email and a hash',async()=>{
  const {calls,post}=founding();
  assert.equal((await post(' Local@Example.invalid ')).status,200);
  assert.equal(calls[0].name,'founding_signup_limited');
  assert.equal(calls[0].params.p_email,'local@example.invalid');
  assert.equal(calls[0].params.p_ip_hash,'a'.repeat(64));
});
test('signup denies quota exhaustion and fails closed for missing migration/key/network',async()=>{
  const limited=await founding({data:false,error:null}).post('local@example.invalid');
  assert.equal(limited.status,429);
  assert.equal(limited.headers.get('retry-after'),'3600');
  for(const result of [{data:null,error:{code:'PGRST202'}},{data:null,error:null},new Error('network')]){
    assert.equal((await founding(result).post('local@example.invalid')).status,503);
  }
  assert.equal((await founding(undefined,false).post('local@example.invalid')).status,503);
});
test('signup validates UTF-8 bytes, not just characters, before database work',async()=>{
  const {calls,post}=founding();
  assert.equal((await post('é'.repeat(160)+'@example.invalid')).status,400);
  assert.equal((await post('not an email')).status,400);
  assert.equal(calls.length,0);
});

test('security helper validates RPC response and does not let cleanup failure lose results',async()=>{
  let result={data:{allowed:true,reservation_id:lease},error:null};
  const helper=load('src/lib/supabase/security.ts',{
    'server-only':{},'node:crypto':{},
    '@supabase/supabase-js':{createClient:()=>({rpc:async()=>result})},
  },{NEXT_PUBLIC_SUPABASE_URL:'http://unused.invalid',SUPABASE_SERVICE_ROLE_KEY:'unit-test-placeholder'});
  assert.equal((await helper.reserveExtraction(id,1)).reservation_id,lease);
  for(const data of [null,{allowed:true},{allowed:true,reservation_id:'bad'},{allowed:false,retry_after:0}]){
    result={data,error:null};
    await assert.rejects(helper.reserveExtraction(id,1),/Invalid upload reservation/);
  }
  result={data:null,error:{code:'PGRST202'}};
  await assert.rejects(helper.reserveExtraction(id,1),/Upload reservation failed/);
  await helper.finishExtraction(lease);
  const missing=load('src/lib/supabase/security.ts',{'server-only':{},'node:crypto':{},'@supabase/supabase-js':{}});
  await assert.rejects(missing.reserveExtraction(id,1),/not configured/);
});

test('provider sends an output cap and rejects length-truncated financial results',async()=>{
  let sent;
  const {openAiExtractor}=load('src/lib/extract/openai.ts',{
    './validate':{validateExtraction:()=>({transactions:[],warnings:[]})},
    './today':{weekdayOf:()=> 'Friday'},
  },{OPENAI_API_KEY:'unit-test-placeholder'}, {
    fetch:async(_url,init)=>{
      sent=JSON.parse(init.body);
      return Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]});
    },
  });
  await assert.rejects(openAiExtractor.extract([],{today:'2026-09-04'}),/output limit/);
  assert.equal(sent.max_completion_tokens,8192);
});
