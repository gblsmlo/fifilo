# Security and data governance

This document is not legal advice. The organization operating a deployment
decides purposes, legal bases, retention, access and data-subject handling
before real data enters the system. The starter provides the controls; the
operator approves how they are used.

## Recommendation

Adopt a simple baseline that applies from the first deploy:

1. four classification levels;
2. least privilege per role;
3. access by need and by organization;
4. retention by purpose and by lifecycle state;
5. legal hold with approval and a review date;
6. an audit trail for sensitive operations;
7. periodic review while the product is in early access.

Each organization has an operational owner, a privacy owner, a channel for
data-subject requests, an approved policy and a list of applicable
sub-processors. The platform itself acts as an independent controller only for
its own account, security, billing and operational data. Those purposes stay
separate in the inventory and in contracts.

## Classification

### Level 1: Public

Information approved for public disclosure.

Examples: the organization's public name, published address, approved public
templates.

Controls:

- broad access within the organization;
- may appear in logs when not combined with personal data;
- no encryption beyond the platform baseline.

### Level 2: Internal

Operational information without sensitive content.

Examples: organization settings, workflow configuration, aggregated metrics,
internal notes without personal data.

Controls:

- active members of the organization only;
- export limited to admins and owners;
- audit for administrative changes.

### Level 3: Confidential

Personal data and the business context needed to serve the customer.

Examples: names, phone numbers, emails, messages, proposals, ordinary
registration documents.

Controls:

- access by role and by need;
- forbidden in logs and third-party analytics;
- download and export are audited;
- encryption in transit and at rest;
- masked in support tooling and non-production environments.

### Level 4: Restricted

Sensitive data, professional secrecy and high-impact documents.

Examples: health, biometric or other special-category data; identity
documents; signed contracts; credentials, tokens and secrets; full
organization exports.

Controls:

- explicitly authorized access;
- dual approval for full export and for exceptional release;
- read and download audited when technically feasible;
- short-lived signed URLs;
- forbidden in notifications, analytics and logs;
- support never accesses it without the break-glass procedure;
- field-level encryption where the threat model requires it.

## Access matrix

Legend:

- `R`: read;
- `W`: create or change;
- `A`: approval or privileged operation;
- `-`: no access by default.

The starter ships the Better Auth organization roles `owner`, `admin` and
`member`. A product that adds roles extends the rows; it does not weaken them.

| Resource | Owner | Admin | Member |
| --- | --- | --- | --- |
| Organization settings | A | R/W | R |
| Members and roles | A | R/W | R |
| Invitations | A | R/W | - |
| Audit log | R | R limited | - |
| Full export | A with re-authentication | - | - |
| Retention and legal hold | A | Requests | - |

Rules:

- a technical administrator does not automatically get unrestricted access to
  business content;
- owning the organization is not the same as being authorized for a resource;
  authorization is decided per resource and per role;
- every privileged permission is enforced on the server; client-supplied
  organization ids, roles or ownership claims are never authorization evidence
  (Decision 002);
- a role change revokes sessions or forces an immediate refresh;
- offboarding removes membership, revokes sessions and reassigns pending work;
- temporary access has a justification, an approver and an expiry.

## Break-glass

Exceptional support access to confidential or restricted data:

1. an incident or support request is recorded;
2. the organization owner approves;
3. scope and duration are the minimum needed;
4. a separate session with MFA;
5. a visible banner announcing exceptional access;
6. queries and downloads are audited;
7. access is revoked automatically at expiry;
8. a review happens afterwards.

Silent impersonation is not allowed.

## Retention

The periods below are product defaults, not conclusions about legal
obligations. The first business capability adds its own rows for the records it
owns, following the same shape.

| Class | Start event | Default | Outcome |
| --- | --- | --- | --- |
| Raw webhook payloads | Receipt | 30 days | Delete |
| Idempotency records | Processing | 90 days | Delete |
| Audit logs | Event | 5 years | Delete after review |
| Security logs | Event | 12 months | Delete |
| Generated exports | Generation | 24 hours | Delete file |
| Backups | Creation | 35 days | Expire automatically |
| Expired invitations | Expiry | 90 days | Delete or minimize |
| Revoked or expired sessions | End | 90 days | Delete or minimize |
| Incomplete uploads | Upload failure | 24 hours | Delete |
| Records under legal hold | Hold start | Until release | Preserve |

Rules:

- the organization may configure a shorter period once the purpose ends;
- a longer period needs a documented purpose or obligation;
- the clock pauses during a legal hold;
- anonymized data stops being personal only when re-identification is not
  reasonably possible;
- backups expire through the normal cycle and are never restored for active use
  without re-applying deletion requests;
- deletion covers the database, object storage, search indexes, caches and
  queues;
- the retention job produces a report without copying the deleted content.

## Retention states

```text
active
  -> retention_scheduled
  -> held
  -> deletion_approved
  -> deleting
  -> deleted | deletion_failed
```

A failed deletion must be retryable and visible in the internal panel.

## Legal hold

A legal hold blocks deletion while there is an obligation to preserve
information. It does not grant additional access.

Minimum fields: scope (record, document or organization), reason, requester,
approver, start, review date, optional end date, evidence by reference, status
and a release record.

Flow:

1. an authorized member requests the hold;
2. an authorized owner approves;
3. the system identifies the affected records;
4. retention jobs skip the scope;
5. the hold is reviewed periodically;
6. release requires a justification;
7. normal retention is recalculated from the approved policy.

## Data-subject requests

The product records: confirmation of processing, access or export, correction,
anonymization, blocking or deletion, portability when applicable, information
about sharing, consent withdrawal, and objection or review.

```text
received -> identity_verification -> assessment
  -> approved | partially_approved | denied
  -> executing -> completed
```

Every denial or partial fulfilment carries a justification recorded by the
operator. The platform provides the tooling; the organization decides the
answer.

## Mandatory audit

Audit:

- login, MFA and account recovery;
- invitation, role change and offboarding;
- organization switch;
- access to and download of restricted documents;
- export;
- creation and release of a legal hold;
- change to a retention policy;
- data-subject request;
- break-glass access;
- administrative correction.

Audit events carry references and permitted diffs. They never duplicate
messages, documents, secrets or complete sensitive records. Security and audit
events are emitted through `@twincam/observability`.

## Gate before real data

Before importing or receiving real data:

- access matrix approved by the operating organization;
- operational and privacy owners named;
- purposes and legal bases recorded;
- retention periods reviewed per class;
- legal hold procedure approved;
- data-subject channel defined;
- processing agreements and sub-processors reviewed;
- negative permission and RLS tests passing (two organizations, no context,
  `WITH CHECK`, rollback);
- export and deletion tested end to end;
- backup and restore tested;
- incident runbook aligned with the notification duties of the applicable
  jurisdiction;
- threat model and data-flow diagram reviewed.

The rule is jurisdiction-neutral on purpose. Each deployment maps these gates to
the regulation that applies to it.
