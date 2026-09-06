# Decision 015: documentation is addressed by index; superseded decisions move to `archive/`

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 071; the starter keeps the rule and drops the product-specific evidence.

## Context

Documentation in this repository is consumed mostly by agents, through skills
and guides that cite decisions. The reference product measured what happens
when those citations address files.

Skills linked decision files directly, some decisions dozens of times. Renaming
or archiving one broke every skill at once, and the skill went stale in
silence. The decision index had no state: superseded decisions sat as peers of
active ones, so a reader loaded both and could follow the dead one. Two
decisions shared a number, so "Decision 003" was ambiguous in the repository,
in skills and in pull requests. And a 3,000-line architecture document written
before the build was still cited as a live source. Its entity dictionary
described tables that did not exist and omitted most that did.

The starter begins with sixteen decisions and one index. The rule is written
now so the index is the address from the first citation.

## Options considered

1. **Keep addressing by file and fix what breaks.** Cheap today; the defect
   returns with the next superseded decision, and the cost grows with the
   number of citations.
2. **Delete superseded decisions.** Resolves the token, loses the recorded
   trade-off, which is the reason an ADR exists, and breaks historical
   citations.
3. **The index resolves, history lives in `archive/`, review enforces.** It
   costs one reading hop; in exchange, renames and archiving stop breaking
   skills, and the state in the index avoids useless reading.

## Decision

Adopt option 3.

### The index resolves; the citation carries the number

`docs/decisions/README.md` maps number → file → state. The number is the
stable address. The file name and the folder are not.

A skill, guide or pull request cites "Decision NNN" in prose and links only the
index. It never links a decision file by path. A skill's `source:` field
carries the number, not the path.

Engineering guides under `docs/engineering/` and code files keep direct paths.
They are not numbered and are not archived; the path is the evidence.

The same rule applies to bugs: `BUG-NNN` in prose, `docs/bugs/README.md` as the
resolver.

### The state says whether it is worth opening

Three values:

| State | Meaning |
| --- | --- |
| active | governs new code |
| active · refined by NNN | still governs; decision NNN narrows or extends the cut |
| historical · see NNN | does not govern new code; NNN is the successor |

### A superseded decision lives in `archive/`

A decision moves to `docs/decisions/archive/` when its own Status declares it
substituted or superseded **and** the successor exists. It does not guide new
code. A reference from a historical document (a bug, a research note, an
archived plan, the successor decision) keeps pointing at the archived file. A
reference from a live guide points at the successor.

Archiving never renumbers. The number stays reserved and the index keeps the
row with the historical state.

### A document holds only what only it holds

An engineering guide does not repeat a rule that a decision or another guide
already governs. It points. Territory with no owner becomes its own file under
`docs/engineering/` and enters the index.

The database schema is read from `packages/infra/database/src/schema.ts`, never
from a prose dictionary. Prose that describes tables ages worse than not
existing, because it gives the wrong name with the look of a source.

### Enforcement is review

A pull request that links a decision file by path, cites a decision absent from
the index, or adds a decision without an index row is a review finding. There is
no gate script in the starter.

## Consequences

- Every decision written in this repository, this one included, lists the
  index in its `Related` section and cites other decisions by number in prose.
- The index is the only file a skill needs to know about to find any decision.
- Whoever needs the body of a decision makes two hops: index, then file. That
  cost is accepted.
- `docs/architecture.md` stays short and points to decisions; it does not
  restate their rules or describe tables.

## Revisit when

- A skill needs a cut of a decision the index cannot express. Either the index
  is too poor, or the cut is skill content.
- The index passes roughly a hundred rows and reading it competes with what it
  saves. Group by territory before accepting the cost.
- A third numbered category appears in `docs/` (today: decisions; bugs when
  they arrive). Decide whether it gets its own index or joins an existing one.
- Review stops catching path links to decision files. Then a gate script earns
  its place, and this decision records it.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 016 in prose: the same "record the answer where it is decided"
  discipline, applied to issues instead of documents.
