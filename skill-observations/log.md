# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue. Resolved statuses always carry a date.

---

## 2026-11-01

### Observation 1: Explicit repair authorization should override the default audit stop

**Status:** OPEN
**Date:** 2026-11-01
**Session context:** Product quality audit with a user request to inspect, fix, and retest in one run
**Skill:** product-inspector
**Type:** open-source
**Phase/Area:** Guardrails and execution workflow

**Issue:** The skill requires an audit-only pass followed by a stop for approval, even when the same user request explicitly authorizes diagnosis, fixes, and verification. This creates an unnecessary extra turn and blocks the requested work.

**Suggested improvement:** Keep audit-only as the default. State that a direct user request to fix and retest authorizes those reversible code changes, while preserving separate confirmation gates for destructive, external, or deployment actions.

**Principle:** Approval gates should protect actions the user has not authorized. They should not block work the user explicitly requested.

### Observation 2: Runtime verification caught a stale source assumption and surfaced a crash

**Status:** OPEN
**Date:** 2026-11-01
**Session context:** Full launcher review with live release and dev runtime checks
**Skill:** principle-prove-it-works / product-inspector
**Type:** workflow
**Phase/Area:** Runtime verification

**Issue:** The frontend build passed while the actual desktop app was blank due to a temporal-dead-zone ReferenceError. Later, stale copy came from backend game metadata rather than the frontend fallback object.

**Suggested improvement:** When verifying desktop UI changes, inspect the rendered release app and verify the source that actually populates the visible data; do not stop at bundler success or frontend fallback code.

**Principle:** Verify the behavior at its real source and in its real runtime.
