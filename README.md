# Fleet CI

Organization-wide GitHub Actions runner policy for `joshevanlee-org`.

## Policy

- Documentation-only jobs use `blacksmith-2vcpu-ubuntu-2404`.
- Node/Bun build, test, deploy, and visual jobs use `blacksmith-4vcpu-ubuntu-2404`.
- Runtime versions must be explicit.
- Native GitHub cache actions are preferred; archived Blacksmith cache forks are not used.
- GitHub-hosted runners require a documented exception in `policy/workflow-policy.json`.

## Checks

Run the unit tests with `node --test scripts/*.test.mjs`.

Run the organization audit with `GITHUB_TOKEN=... node scripts/audit-organization.mjs`.
The audit uses the workflow's built-in `GITHUB_TOKEN` and does not print credentials.

Repositories should add a thin caller workflow using
`joshevanlee-org/fleet-ci/.github/workflows/check.yml@main` and pin that reference
to a release SHA before making the check required in branch protection.

Repositories keep their own triggers, commands, path filters, deployment environments, and secrets. This repository owns only the fleet runner policy and audit.
