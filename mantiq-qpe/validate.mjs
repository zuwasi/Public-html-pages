import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const engine = html.match(/<script id="qpe-engine">([\s\S]*?)<\/script>/)[1];
const qpe = runInNewContext(`${engine}\nQPE;`);
const tolerance = 1e-10;
let cases = 0;
function close(actual, expected, label) {
  assert.equal(actual.length, expected.length, label);
  const difference = Math.max(...actual.map((p, i) => Math.abs(p - expected[i])));
  assert.ok(difference < tolerance, `${label}: maximum error ${difference}`);
  assert.ok(actual.every(p => Number.isFinite(p) && p >= 0), `${label}: invalid probability`);
  assert.ok(Math.abs(actual.reduce((a,b) => a+b,0)-1) < tolerance, `${label}: normalization`);
  cases++;
}

// Exhaustive dyadic outcomes use an independently known one-hot expectation.
for (let m = 1; m <= 8; m++) {
  const n = 2 ** m;
  for (let k = 0; k < n; k++) {
    close(qpe.simulate({m,phiA:k/n}), Array.from({length:n}, (_,y) => Number(y===k)), `dyadic m=${m} k=${k}`);
  }
}

// Deterministically generated valid inputs exercise oracle agreement, normalization,
// swapping the eigenstate labels, and covariance under a one-bin phase shift.
let seed = 20260924;
function random() { seed = (Math.imul(1664525,seed)+1013904223) >>> 0; return seed / 4294967296; }
for (let i=0; i<160; i++) {
  const m=1+i%8, n=2**m, phiA=random(),phiB=random(),weight=random();
  const options={m,phiA,phiB,weight}, actual=qpe.simulate(options);
  close(actual,qpe.reference(options),`generated oracle case ${i}`);
  close(qpe.simulate({m,phiA:phiB,phiB:phiA,weight:1-weight}),actual,`eigenstate relabeling ${i}`);
  close(qpe.simulate({m,phiA:(phiA+1/n)%1,phiB:(phiB+1/n)%1,weight}),
    Array.from({length:n},(_,y)=>actual[(y-1+n)%n]),`circular shift ${i}`);
}

for (const phiA of [0,1e-15,1-Number.EPSILON,1/16-1e-10,1/16+1e-10,1/3]) {
  close(qpe.simulate({m:6,phiA}),qpe.reference({m:6,phiA}),`boundary ${phiA}`);
}
close(qpe.simulate({m:3,phiA:1/8,phiB:5/8,weight:.25}),[0,.25,0,0,0,.75,0,0],'asymmetric eigenstate populations');
close(qpe.simulate({m:2,phiA:1/8}),[(2+Math.SQRT2)/8,(2+Math.SQRT2)/8,(2-Math.SQRT2)/8,(2-Math.SQRT2)/8],'half-bin tie');

const evidence = JSON.parse(readFileSync(new URL('./evidence/reference.json',import.meta.url)));
const vectorCases = {
  nonDyadicOneThird:{m:3,phiA:1/3},
  wrapNearOne:{m:5,phiA:1-1e-9},
  weightedOrthogonal:{m:3,phiA:1/8,phiB:5/8,weight:.25},
};
for(const [name,options] of Object.entries(vectorCases)) {
  const vector = evidence.vectors.find(v=>v.name===name);
  assert.ok(vector,`missing independent vector ${name}`);
  close(qpe.simulate(options),vector.probabilities,`Wolfram vector ${name}`);
}
for(const [path,hash] of Object.entries(evidence.sourceHashes)) {
  const actual=createHash('sha256').update(readFileSync(new URL(`./evidence/${path}`,import.meta.url))).digest('hex');
  assert.equal(actual,hash,`Wolfram source hash ${path}`);
}
assert.ok(evidence.checks.every(c=>c.status==='pass'),'Wolfram checks must pass');

const correct=[0,0,0,1,0,0,0,0];
close(qpe.simulate({m:3,phiA:3/8,fault:'sign'}),[0,0,0,0,0,1,0,0],'wrong Fourier sign counterexample');
close(qpe.simulate({m:3,phiA:3/8,fault:'reverse'}),[0,0,0,0,0,0,1,0],'bit reversal counterexample');
for(const fault of ['sign','reverse','power']) {
  assert.ok(qpe.difference(qpe.simulate({m:3,phiA:3/8,fault}),correct)>.1,`must reject ${fault}`);
}
assert.deepEqual(Array.from(qpe.sample(correct,1024,42)),[0,0,0,1024,0,0,0,0]);
const distribution=[0,.25,0,0,0,.75,0,0];
const counts=qpe.sample(distribution,100000,42);
assert.equal(counts.reduce((a,b)=>a+b,0),100000);
assert.ok(Math.abs(counts[1]/100000-.25)<.005,'seeded sampling must follow probabilities');
assert.deepEqual(Array.from(counts),Array.from(qpe.sample(distribution,100000,42)),'reproducible sampling');
assert.notDeepEqual(Array.from(counts),Array.from(qpe.sample(distribution,100000,43)),'seed must affect samples');

for (const options of [{m:0,phiA:0},{m:9,phiA:0},{m:2.5,phiA:0},{m:3,phiA:1},{m:3,phiA:-.1},{m:3,phiA:NaN},{m:3,phiA:Infinity},{m:3,phiA:.2,weight:1.01},{m:3,phiA:.2,phiB:NaN}]) {
  assert.throws(()=>qpe.simulate(options),/must/);
}
assert.throws(()=>qpe.sample(correct,0,42),/Invalid/);
assert.throws(()=>qpe.sample(correct,10,0),/Invalid/);
console.log(`PASS: ${cases} distribution checks; 510 dyadic cases; 160 generated inputs with three properties each; 3 injected faults rejected; independent Wolfram vectors and hashes matched; sampling and input boundaries passed.`);
console.log(`Node ${process.version}; engine SHA-256 ${createHash('sha256').update(engine).digest('hex')}`);
