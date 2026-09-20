# AKURAT Admin — Data Contract and Gap Audit

## Purpose

This document maps the current Firestore data to the reconstructed admin experience. A UI item may only be shown as a real metric when the source listed here exists and has valid data.

## Current sources

| Domain | Collection/source | Current UI consumers | Important limitation |
|---|---|---|---|
| Platform users | users | Dashboard, analytics, students, teachers | isActive is account access status, not recent activity |
| External exam users | exam_users | Exam User management | Verification workflow fields are not yet fully standardized |
| Classes | classes | Classes, dashboard | subject is legacy free text |
| School exam schedules | exam_schedules | School exams, classes | Status only supports draft, active, closed |
| School exam sessions | exam_sessions | Dashboard, analytics, results | Mixed legacy and newer result shapes must be normalized |
| Learning materials | materials | Materials, dashboard | topic/subtopic are legacy free text |
| School question bank | question_bank | Question bank, analytics | Review lifecycle and taxonomy are not present in legacy records |
| MSAT definitions | msat_access_code | Live monitor, MSAT analytics | Status values need one canonical lifecycle |
| MSAT sessions | msat_sessions | Live monitor, results, certificates | Several historical score shapes exist |
| MSAT questions | msat_question | MSAT question bank | Domain fields differ from school taxonomy |
| Certificates | certificates | Certificate management | Delivery and revocation states need validation |
| Audit events | audit_logs | Audit Trail, dashboard | Existing logs do not always include reason, result, and before/after |
| Platform config | config/platform | Platform Settings | Config API exists; permission granularity is still admin-only |
| Academic taxonomy | taxonomy_nodes | Taxonomy manager and future content filters | New backward-compatible source; legacy content requires migration |

## Canonical academic taxonomy

The canonical hierarchy is:

Mata Pelajaran → Kurikulum → Jenjang/Kelas → Unit → Topik → Subtopik → Tujuan Pembelajaran

Each node contains:

- id
- level
- name
- slug
- description
- parentId
- ancestorIds
- order
- status
- aliases
- createdAt
- updatedAt

Materials, questions, and classes retain their legacy topic/subject fields during migration and receive an optional taxonomy object. This prevents existing content from disappearing while migration is in progress.

## Metric glossary

| Metric | Definition |
|---|---|
| Registered accounts | Total documents in users |
| Accounts allowed to access | users where isActive is true |
| New registrations | users created inside the selected period |
| Active users | Requires a lastActivityAt or event stream; must not be inferred from isActive |
| Exam sessions | Total session documents for the relevant exam system |
| Completion rate | completed sessions divided by all eligible session records in scope |
| Abandonment rate | abandoned sessions divided by all sessions in scope |
| Anomaly rate | sessions with anomalyFlags or flagged status divided by all sessions in scope |
| Average accuracy | Mean result accuracy for completed sessions that contain accuracy |
| Average score | Mean finalScore or numericScore for sessions that contain a valid score |
| Average duration | Mean difference between completedAt and startedAt for complete timestamps |
| Content readiness | Published/active content divided by all content in the selected scope |
| Question risk | Questions with sufficient usage and correct rate below the defined threshold |

## Permission baseline

The current authentication model only stores student, teacher, and admin. Until granular roles are introduced:

- All admin APIs must verify the admin role on the server.
- Sensitive data must not rely on hidden UI controls for authorization.
- Destructive and security-sensitive actions must create an audit log.
- Preview mode does not change the server-side role.

Planned granular admin capabilities:

| Capability | Super Admin | Operations | Content Admin | Exam Proctor | Analyst |
|---|---:|---:|---:|---:|---:|
| Platform settings | Write | Read | No | No | Read |
| Users and access | Write | Write | Read | Read | Read |
| Academic taxonomy | Write | Read | Write | Read | Read |
| Materials/questions | Write | Read | Write | Read | Read |
| School exams | Write | Write | Read | Write | Read |
| AKURAT Exam live controls | Write | Read | No | Write | Read |
| Results/certificates | Write | Write | Read | Read | Read |
| Developer tools | Write | No | No | No | No |
| Analytics | Read | Read | Read | Read | Read |

## Known gaps that must not be faked in UI

- Real DAU/WAU/MAU needs a reliable activity event or lastActivityAt.
- Retention and funnel analytics need event tracking.
- Notification delivery health needs delivery logs.
- Database latency and backup status need infrastructure probes.
- Question distractor effectiveness needs per-option aggregate responses.
- MSAT calibration and exposure require canonical item-statistic fields.
- School/institution scope is not consistently normalized.
- Fine-grained admin roles require a permission model and claims strategy.
- Realtime live monitoring needs heartbeat timestamps and a polling or streaming contract.
- Audit before/after values and reasons are missing from older actions.

## Migration order

1. Seed taxonomy_nodes with subjects and active curricula.
2. Map legacy material topic/subtopic values.
3. Map legacy school question topic/subtopic values.
4. Map class subject values.
5. Add taxonomy IDs to creation and edit forms.
6. Add taxonomy filters to APIs.
7. Report unmapped content in the data-quality queue.
8. Stop accepting new free-text subject/topic values after migration coverage is sufficient.
