import assert from "node:assert/strict";
import test from "node:test";
import { inspectWorkflow, parseWorkflow } from "./check-workflow-policy.mjs";

test("accepts approved Blacksmith runners", () => {
  const findings = inspectWorkflow("ci.yml", parseWorkflow("jobs:\n  verify:\n    runs-on: blacksmith-4vcpu-ubuntu-2404\n"));
  assert.deepEqual(findings, []);
});

test("rejects hosted, dynamic, and missing runners", () => {
  const findings = inspectWorkflow("ci.yml", parseWorkflow(
    "jobs:\n  hosted:\n    runs-on: ubuntu-latest\n  dynamic:\n    runs-on: ${{ matrix.os }}\n  missing: {}\n",
  ));
  assert.equal(findings.length, 3);
  assert.match(findings.map((finding) => finding.job).join(","), /hosted,dynamic,missing/);
});
