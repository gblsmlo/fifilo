# Known bugs

This directory preserves reproducible evidence of defects found during
implementation or validation. It is not a backlog: priority, owner, dependencies
and execution stay in the tracker of the product built on this starter.

Each record distinguishes observed fact from hypothesis, names the revision
where it was reproduced, and declares a verifiable closing condition. A fixed
bug stays when its cause and prevention are useful knowledge. Cite a record as
`BUG-NNN` and link this index; the file name is not the address.

| ID | State | Defect | Main evidence |
| --- | --- | --- | --- |
| 001 | Resolved | [the declared toolchain and the Compose stack did not reproduce from a clean checkout](001-pinned-toolchain-and-compose-not-reproducible.md) | the gate rejected an installed Node, PostgreSQL came up with credentials no application read, and two Playwright versions demanded two browser builds |

## Recording a new bug

Create `NNN-descriptive-slug.md` with the next free number and add its row here.
The record carries, at minimum:

- **State** and traceability to the issue that will fix it, when one exists.
- **Environment**: revision, runtime versions, browser when relevant.
- **Reproduction**: the exact command or steps, and the observed output.
- **Hypothesis**, separated from the facts.
- **Closing condition**: what must be observable for the record to be resolved.

States are free text but stable: `Open`, `In validation`, `Partial`,
`Resolved in <ref>`, `Resolved`. A resolved record keeps the cause and the
prevention that landed.
