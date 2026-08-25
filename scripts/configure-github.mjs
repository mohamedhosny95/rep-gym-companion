#!/usr/bin/env node

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY || "mohamedhosny95/rep-gym-companion";
const checkOnly = process.argv.includes("--check");

if (!token) {
  console.error("Set GH_TOKEN to a repository-administration token. The token value is never printed.");
  process.exit(2);
}
if (!/^[^/]+\/[^/]+$/.test(repository)) {
  console.error("GITHUB_REPOSITORY must use owner/name form.");
  process.exit(2);
}

const [owner] = repository.split("/");
const headers = {
  accept: "application/vnd.github+json",
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  "x-github-api-version": "2026-03-10"
};

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${body.message ?? "unknown error"}`);
  return body;
}

const protectionPayload = {
  required_status_checks: { strict: true, contexts: ["verify", "e2e"] },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 0,
    require_last_push_approval: false
  },
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: false
};

async function inspect() {
  const failures = [];
  let protection;
  try {
    protection = await github(`/repos/${repository}/branches/main/protection`);
  } catch (error) {
    if (/\(404\)/.test(error.message)) failures.push("main is not protected");
    else throw error;
  }
  const contexts = new Set(protection?.required_status_checks?.contexts ?? []);
  for (const context of protectionPayload.required_status_checks.contexts) {
    if (!contexts.has(context)) failures.push(`main does not require ${context}`);
  }
  if (!protection?.enforce_admins?.enabled) failures.push("branch rules do not include administrators");
  if (!protection?.required_pull_request_reviews) failures.push("main does not require pull requests");
  if (!protection?.required_linear_history?.enabled) failures.push("main does not require linear history");
  if (!protection?.required_conversation_resolution?.enabled) failures.push("main does not require resolved conversations");

  let environment;
  try {
    environment = await github(`/repos/${repository}/environments/production`);
  } catch (error) {
    if (/\(404\)/.test(error.message)) failures.push("production environment does not exist");
    else throw error;
  }
  if (!(environment?.protection_rules ?? []).some(rule => rule.type === "required_reviewers")) {
    failures.push("production environment has no required reviewer");
  }
  return failures;
}

if (checkOnly) {
  const failures = await inspect();
  if (failures.length) {
    console.error("GitHub governance is incomplete:\n" + failures.map(item => `  - ${item}`).join("\n"));
    process.exit(1);
  }
  console.log("GitHub branch protection and production approval are configured.");
  process.exit(0);
}

const ownerProfile = await github(`/users/${owner}`);
await github(`/repos/${repository}/branches/main/protection`, {
  method: "PUT",
  body: JSON.stringify(protectionPayload)
});
await github(`/repos/${repository}/environments/production`, {
  method: "PUT",
  body: JSON.stringify({
    wait_timer: 0,
    prevent_self_review: false,
    reviewers: [{ type: "User", id: ownerProfile.id }],
    deployment_branch_policy: { protected_branches: true, custom_branch_policies: false }
  })
});

const failures = await inspect();
if (failures.length) {
  console.error("GitHub accepted the update, but verification still found:\n" + failures.map(item => `  - ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Protected ${repository}: pull requests, verify/e2e checks, linear history, resolved conversations, and production approval are required.`);
