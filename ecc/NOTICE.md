# Third-Party Attribution — ECC Rule Packs

The files under `ecc/rules/` are vendored, unmodified, from:

| | |
|---|---|
| **Project** | ECC — "The agent harness performance optimization system" |
| **Author** | Affaan Mustafa |
| **Source** | https://github.com/affaan-m/ECC |
| **Version** | 2.2.1 |
| **Commit** | `8321021c54d670126ce3b2969d5deb880b4b0c2a` |
| **Retrieved** | 2026-09-12 |
| **License** | MIT — full text in [`LICENSE`](./LICENSE) |

## What was vendored

`rules/` only — 22 language/framework packs plus `rules/common`, 123 files, ~592 KB.
Nothing else from the upstream repository was copied: no agents, skills, commands,
hooks, or installer scripts.

## Why only the rules

ECC's agents (68), skills (292), command shims (94), and hooks require the ECC plugin
runtime, which is installed per-harness via `npx ecc-universal setup` or
`/plugin install ecc@ecc`. They are not vendored here and are not active. Only the
plain-Markdown rule packs are, because any agent harness can read those directly.

Consequence: rule files that say "use the **planner** agent" or "use the
**code-reviewer** agent" refer to ECC agents that may not exist in the harness reading
them. Where an ECC agent is unavailable, perform the equivalent work inline rather
than skipping the step. See the root [`AGENTS.md`](../AGENTS.md).

## Updating

Re-vendor from a newer ECC tag, then update the version and commit hash above:

```bash
git clone --depth 1 --branch <tag> https://github.com/affaan-m/ECC.git /tmp/ecc
rm -rf ecc/rules && cp -r /tmp/ecc/rules ecc/rules && cp /tmp/ecc/LICENSE ecc/LICENSE
```
