import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";
import { createHoleState, holeStateToHole, reduceHoleEvent } from "../src/core/reducer.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(await fs.readFile(path.join(ROOT, "test/fixtures/reducer-goldens/cases.json"), "utf8"));

function summarizeEffects(effects) {
  const out = { ...effects };
  if (out.createdNode) {
    out.createdNodeId = out.createdNode.id;
    delete out.createdNode;
  }
  if (out.answeredNode) {
    out.answeredNodeId = out.answeredNode.id;
    delete out.answeredNode;
  }
  return out;
}

function runCorpus(api, corpus) {
  return corpus.map((testCase) => {
    let state = api.createHoleState(testCase.initial);
    let effects = {};
    try {
      for (const step of testCase.events) {
        ({ state, effects } = api.reduceHoleEvent(state, step.event, step.options));
      }
      return { name: testCase.name, state: api.holeStateToHole(state), effects: summarizeEffects(effects) };
    } catch (error) {
      return { name: testCase.name, error: error.message };
    }
  });
}

function assertGoldens(results, environment) {
  assert.equal(results.length, cases.length);
  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index];
    const actual = results[index];
    assert.equal(actual.name, testCase.name);
    if (testCase.expected_error) {
      assert.equal(actual.error, testCase.expected_error, `${environment}: ${testCase.name}`);
    } else {
      assert.deepEqual(actual.state, testCase.expected, `${environment}: ${testCase.name} state`);
      assert.deepEqual(actual.effects, testCase.expected_effects, `${environment}: ${testCase.name} effects`);
    }
  }
}

const nodeResults = runCorpus({ createHoleState, holeStateToHole, reduceHoleEvent }, cases);
assertGoldens(nodeResults, "node");

// Measurement point for the Phase 5 purity decision, not a product contract:
// the cloned Map still contains the same node object, which Object.assign mutates.
const priorState = createHoleState({ root_id: "root", nodes: [{ id: "root", markdown: "before" }] });
const priorNode = priorState.nodes.get("root");
const mutationResult = reduceHoleEvent(priorState, { type: "node_progress", node_id: "root", markdown: "after" });
assert.equal(priorNode.markdown, "after");
assert.equal(priorState.nodes.get("root").markdown, "after");
assert.strictEqual(mutationResult.state.nodes.get("root"), priorNode);

const bundle = await esbuild.build({
  stdin: {
    contents: `import { createHoleState, holeStateToHole, reduceHoleEvent } from "./src/core/reducer.js";
globalThis.ReducerUnderTest = { createHoleState, holeStateToHole, reduceHoleEvent };`,
    resolveDir: ROOT,
    sourcefile: "reducer-browser-entry.js",
  },
  bundle: true,
  format: "iife",
  target: "es2018",
  write: false,
  logLevel: "silent",
});

const browser = await chromium.launch();
let browserResults;
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><meta charset=utf-8><title>Reducer conformance</title>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  browserResults = await page.evaluate(({ corpus, runner, summarizer }) => {
    const run = (0, eval)(`(() => { const summarizeEffects = ${summarizer}; return ${runner}; })()`);
    return run(globalThis.ReducerUnderTest, corpus);
  }, { corpus: cases, runner: runCorpus.toString(), summarizer: summarizeEffects.toString() });
} finally {
  await browser.close();
}

assertGoldens(browserResults, "browser");
assert.deepEqual(browserResults, nodeResults, "Node and browser must produce identical reducer projections");

// The stale-progress golden intentionally records today's last-write-wins gap.
// Phase 5/6's {id, seq} order guard should replace and retire that known-defect expectation.
console.log(`ok stage14: ${cases.length} reducer goldens conform in node and browser; mutation semantics measured`);
