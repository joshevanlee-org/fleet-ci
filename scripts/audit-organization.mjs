import { inspectWorkflow, parseWorkflow, formatFinding } from "./check-workflow-policy.mjs";

const organization = process.env.GITHUB_ORGANIZATION ?? "joshevanlee-org";
const apiBase = process.env.GITHUB_API_URL ?? "https://api.github.com";
const token = process.env.GITHUB_TOKEN;

if (!token) throw new Error("GITHUB_TOKEN is required");

async function github(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.json();
}

async function listRepositories() {
  const repositories = [];
  for (let page = 1; ; page += 1) {
    const batch = await github(`/orgs/${organization}/repos?type=all&per_page=100&page=${page}`);
    repositories.push(...batch);
    if (batch.length < 100) return repositories;
  }
}

async function inspectRepository(repository) {
  if (repository.archived || repository.disabled) return [];
  let files;
  try {
    files = await github(`/repos/${organization}/${repository.name}/contents/.github/workflows`);
  } catch (error) {
    if (String(error).includes("GitHub API 404")) return [];
    throw error;
  }
  return (await Promise.all(files
    .filter((file) => file.type === "file" && /\.ya?ml$/i.test(file.name))
    .map(async (file) => {
      const payload = await github(`/repos/${organization}/${repository.name}/contents/${file.path}`);
      const content = Buffer.from(payload.content, "base64").toString("utf8");
      return inspectWorkflow(`${repository.name}/${file.path}`, parseWorkflow(content));
    }))).flat();
}

const findings = (await Promise.all((await listRepositories()).map(inspectRepository))).flat();
if (findings.length) {
  console.error(findings.map(formatFinding).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Blacksmith workflow policy passed for ${organization}.`);
}
