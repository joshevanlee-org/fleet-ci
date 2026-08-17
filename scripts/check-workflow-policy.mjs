import { access, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export const APPROVED_RUNNERS = new Set([
  "blacksmith-2vcpu-ubuntu-2404",
  "blacksmith-4vcpu-ubuntu-2404",
]);

function stripComment(line) {
  return line.replace(/\s+#.*$/, "");
}

function unquote(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

export function parseWorkflow(content) {
  const jobs = [];
  let inJobs = false;
  let currentJob = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line.trim()) continue;
    const indentation = line.match(/^ */)[0].length;
    const text = line.trim();

    if (indentation === 0 && text === "jobs:") {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (indentation === 2 && !text.startsWith("-") && /^[^:]+:\s*(?:\{\})?$/.test(text)) {
      currentJob = { id: text.split(":", 1)[0], runner: null, hasRunner: false };
      jobs.push(currentJob);
      continue;
    }
    if (indentation === 0) {
      inJobs = false;
      currentJob = null;
      continue;
    }
    if (currentJob && indentation >= 4 && text.startsWith("runs-on:")) {
      currentJob.runner = unquote(text.slice("runs-on:".length).trim());
      currentJob.hasRunner = true;
    }
  }
  return { jobs };
}

export function inspectWorkflow(workflowName, workflow) {
  if (!workflow.jobs.length) {
    return [{ workflow: workflowName, job: "<none>", runner: "<missing>", reason: "workflow has no jobs" }];
  }
  return workflow.jobs.flatMap((job) => {
    if (!job.hasRunner) {
      return [{ workflow: workflowName, job: job.id, runner: "<missing>", reason: "job has no runs-on" }];
    }
    if (!APPROVED_RUNNERS.has(job.runner)) {
      return [{ workflow: workflowName, job: job.id, runner: job.runner, reason: "runner is not approved" }];
    }
    return [];
  });
}

export function formatFinding(finding) {
  return `${finding.workflow} / ${finding.job}: ${finding.reason} (${finding.runner}); use an approved Blacksmith runner.`;
}

export async function discoverWorkflowFiles(rootDirectory) {
  const workflowDirectory = join(rootDirectory, ".github", "workflows");
  try {
    await access(workflowDirectory);
  } catch {
    return [];
  }
  return (await readdir(workflowDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => join(workflowDirectory, entry.name))
    .sort();
}

export async function checkRepository(rootDirectory) {
  const findings = [];
  for (const workflowPath of await discoverWorkflowFiles(rootDirectory)) {
    const workflowName = relative(rootDirectory, workflowPath);
    findings.push(...inspectWorkflow(workflowName, parseWorkflow(await readFile(workflowPath, "utf8"))));
  }
  return findings;
}
