// Run: node verify.mjs (Node 18+). No packages, network, browser or generated files.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const source=html.match(/<script id="benchmark-engine">([\s\S]*?)<\/script>/)[1];
vm.runInThisContext(source,{filename:'index.html#benchmark-engine'});
const B=globalThis.MemoryBench;
let checks=0;
const eq=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const estimate=s=>Math.floor((Buffer.byteLength(s,'utf8')+3)/4);

// Independent outcome oracle: explicit fixture semantics, not B.resolve or row.expected.
function expectedOutput(row,c) {
 if(row.scenario==='debug')return 'clear-cache';
 if(row.scenario==='skill')return 'lock-build-test';
 if(row.strategy==='stateless')return 'unknown';
 if(row.scenario==='preference')return 'TypeScript';
 if(row.scenario==='temporal')return row.step===1||!c.fresh?'AWS':'Azure';
 if(row.scenario==='poison')return c.trust||!c.fresh?'keep-audit':'disable-audit';
 if(row.scenario==='isolation')return c.scope?(row.step===2?'beta-db':'alpha-db'):(c.fresh?'beta-db':'alpha-db');
 throw Error('Unknown scenario');
}
const truth={debug:['clear-cache','clear-cache','clear-cache'],skill:['lock-build-test','lock-build-test','lock-build-test'],preference:['TypeScript','TypeScript','TypeScript'],temporal:['AWS','Azure','Azure'],poison:['keep-audit','keep-audit','keep-audit'],isolation:['alpha-db','beta-db','alpha-db']};

for(const noise of [0,12,48])for(const trust of [false,true])for(const fresh of [false,true])for(const scope of [false,true]) {
 const config={noise,trust,fresh,scope},result=B.run(config,false);
 eq(result.rows.length,54);
 eq(B.run(config,false),result,'Every non-timing field must be deterministic');
 eq(JSON.parse(JSON.stringify(result)),result,'JSON must preserve the entire export');
 for(const strategy of B.strategies) {
  const rows=result.rows.filter(r=>r.strategy===strategy),s=result.summary[strategy];
  let correct=0,regret=0,stale=0,poison=0,tools=0,repeated=0,input=0,context=0;
  for(const r of rows) {
   const expected=expectedOutput(r,config),right=expected===truth[r.scenario][r.step-1];
   eq(r.output,expected,`${JSON.stringify(config)} ${strategy} ${r.scenario} ${r.step}`);
   eq(r.correct,right);eq(r.expected,truth[r.scenario][r.step-1]);
   const usesTools=['debug','skill'].includes(r.scenario);
   const reuse=strategy!=='stateless'&&((r.scenario==='debug'&&r.step>1)||(r.scenario==='skill'&&r.step===3));
   const callCount=usesTools?(reuse?1:3):0;
   const repeatCount=usesTools&&r.step>1&&!reuse?2:0;
   const eligible=!usesTools||r.step>1;
   eq(r.reused,reuse);eq(r.tools.length,callCount);eq(r.repeatedTools,repeatCount);
   eq(r.regretEligible,eligible);eq(r.regret,eligible&&(!right||repeatCount>0));
   eq(r.inputTokens,estimate(r.input));eq(r.contextTokens,estimate(r.contextText));
   eq(r.contextText,JSON.stringify(r.context));
   ok(!Object.hasOwn(r.query,'expected'),'Scoring truth must not be in the agent query');
   eq(r.historyBefore.filter(x=>x.kind==='episode').length,usesTools?r.step-1:0,'Snapshots contain only prior tool episodes');
   eq(r.write!==null,usesTools,'Only successful tool tasks append evidence');
   if(r.write){
    eq(r.write.value,truth[r.scenario][r.step-1]);
    ok(!r.historyBefore.some(x=>x.id===r.write.id),'A request cannot retrieve its own future write');
    eq(r.write.source,'verified-tool');
   }
   if(r.scenario==='temporal')eq(r.historyBefore.some(x=>x.value==='Azure'),r.step>1,'Migration enters history only before request 2');
   if(strategy==='full')eq(r.context,r.historyBefore,'Full context replays precisely the pre-request snapshot');
   if(strategy==='selective'&&r.scenario==='skill')eq(r.context.map(x=>x.evidence),r.step===3?[fresh?['skill-success-2','skill-success-1']:['skill-success-1','skill-success-2']]:[],'Promotion requires two prior verified episodes');
   if(strategy==='stateless')eq(r.context,[]);
   correct+=+right;regret+=+(eligible&&(!right||repeatCount>0));
   stale+=+(r.scenario==='temporal'&&r.step>1&&expected==='AWS');
   poison+=+(r.scenario==='poison'&&expected==='disable-audit');
   tools+=callCount;repeated+=repeatCount;input+=estimate(r.input);context+=estimate(r.contextText);
  }
  eq([s.correct,s.regret,s.stale,s.poisoned,s.toolCalls,s.repeatedTools,s.inputTokens,s.contextTokens],[correct,regret,stale,poison,tools,repeated,input,context]);
  eq([s.tasks,s.regretEligible,s.staleEligible,s.poisonEligible,s.skillEligible],[18,16,2,3,1]);
  eq(s.skillReuse,strategy==='stateless'?0:1);
 }
}

// Generated metamorphic cases: changing record order and adding newer ineligible
// evidence must not change the authorized answer. Vary keys, values and timestamps.
for(let seed=1;seed<=200;seed++) {
 const q={key:`k-${seed}`,project:`p-${seed%7}`,operation:'recall'};
 const old=B.record('old',q.key,`old-${seed}`,seed,q.project);
 const current=B.record('current',q.key,`new-${seed}`,seed+1,q.project);
 const poison=B.record('poison',q.key,'attacker',seed+100,q.project,'external');
 const foreign=B.record('foreign',q.key,'wrong-project',seed+101,'other');
 const irrelevant=B.record('irrelevant','wrong-key','unrelated',seed+102,q.project);
 const items=[old,current,poison,foreign,irrelevant];
 const order=items.slice(seed%5).concat(items.slice(0,seed%5));
 if(seed%2)order.reverse();
 const before=JSON.stringify(order),selection=B.compact(order,q,B.defaults);
 eq(selection.map(r=>r.value),[`new-${seed}`]);
 eq(B.resolve(order,q,B.defaults),`new-${seed}`);
 eq(B.resolve(selection,q,B.defaults),`new-${seed}`);
 eq(JSON.stringify(order),before,'Retrieval must not mutate history');
 eq(B.compact([...order,irrelevant],q,B.defaults),selection,'Irrelevant evidence must be neutral');
 for(const length of [0,1,3,4,5,7,8,9,seed]) {
  const text='א🧪a'.repeat(length);
  eq(B.tokenEstimate(text),estimate(text),'UTF-8 estimate, not UTF-16 string length');
 }
}

// Promotion boundary: 0/1 verified outcomes are insufficient; 2 are sufficient.
// A newer unsupported alternative must not hide the proven procedure.
const q={key:'release',project:'alpha',operation:'procedure'};
const one=B.record('one','release','proven',1,'alpha','verified-tool','episode');
const two=B.record('two','release','proven',2,'alpha','verified-tool','episode');
const alternative=B.record('three','release','unproven',3,'alpha','verified-tool','episode');
for(const [records,expected] of [[[],'unknown'],[[one],'unknown'],[[one,{...two,verified:false}],'unknown'],[[one,two],'proven'],[[one,two,alternative],'proven']]) {
 eq(B.resolve(records,q,B.defaults),expected);
 eq(B.resolve(B.compact(records,q,B.defaults),q,B.defaults),expected);
}
eq(B.act({operation:'procedure'},'unproven').output,'failed-verification');
eq(B.quantile([3,8,1,6],.5),3);eq(B.quantile([3,8,1,6],.95),8);eq(B.quantile([],.5),null);
eq(((1-1764/26031)*100).toFixed(1),'93.2');
eq(((1-1.440/17.117)*100).toFixed(1),'91.6');
eq((72.90-66.88).toFixed(2),'6.02');

const baseline=B.run({},false),minimal=B.run({noise:0},false),noisy=B.run({noise:48},false);
for(const result of [minimal,noisy]) {
 eq(result.summary.selective.inputTokens,baseline.summary.selective.inputTokens);
 eq(result.summary.stateless.inputTokens,baseline.summary.stateless.inputTokens);
}
ok(minimal.summary.full.inputTokens<baseline.summary.full.inputTokens);
ok(baseline.summary.full.inputTokens<noisy.summary.full.inputTokens);
const timed=B.run({},true);
for(const strategy of ['full','selective']) {
 const samples=timed.rows.filter(r=>r.strategy===strategy).flatMap(r=>r.retrievalUs);
 eq(samples.length,450);ok(samples.every(n=>Number.isFinite(n)&&n>=0));
 const sorted=samples.sort((a,b)=>a-b);
 eq(timed.summary[strategy].retrievalP50Us,sorted[224]);
 eq(timed.summary[strategy].retrievalP95Us,sorted[427]);
}
console.log(`PASS: ${checks} assertions; 24 configurations; 200 generated governance/Unicode cases; timing quantiles; published arithmetic.`);
console.table(Object.fromEntries(Object.entries(baseline.summary).map(([k,s])=>[k,{input:s.inputTokens,context:s.contextTokens,correct:s.correct,tools:s.toolCalls,repeatedTools:s.repeatedTools,regret:s.regret,stale:s.stale,poison:s.poisoned,skillReuse:s.skillReuse}])));
for(const result of [minimal,baseline,noisy])console.log(`Noise ${result.config.noise}: ${(100*(1-result.summary.selective.inputTokens/result.summary.full.inputTokens)).toFixed(1)}% lower estimated input (selective vs full)`);
