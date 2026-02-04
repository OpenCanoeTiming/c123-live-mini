---
name: Feature
about: New feature with spec
title: '[FEATURE] '
labels: type/feature, spec/draft
assignees: ''
---

## Description

<!-- High-level description of what we want to achieve -->

## User Value

<!-- Why are we doing this? Who benefits? -->

## Scope Hints

<!-- Optional: what should/shouldn't be included -->

---

**Workflow:**

### Setup
- [ ] Create branch `feature/{N}-{slug}`
- [ ] Add branch link comment to this issue

### Spec Phases (update issue after each!)
- [ ] `/speckit.specify` → comment with spec.md link
- [ ] `/speckit.clarify` → comment with status
- [ ] `/speckit.plan` → comment with plan.md link
- [ ] `/speckit.tasks` → comment with phases overview
- [ ] Change label to `spec/approved`

### Implementation (per phase)
- [ ] Phase 1: Setup → commit, push, comment
- [ ] Phase 2: Foundation → commit, push, comment
- [ ] Phase N: ... → commit, push, comment

### Completion
- [ ] Create PR with `Closes #N`
- [ ] Link to spec: `specs/###-name/`
