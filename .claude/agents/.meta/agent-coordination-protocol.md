# Agent Coordination Protocol

**Version:** 1.0
**Date:** 2025-10-04
**Purpose:** Define how Claude Code agents coordinate, delegate, and share context via MCP

---

## Overview

This document establishes coordination patterns for the 49 agents in the Claude Code ecosystem. Proper coordination ensures:

- **Consistency:** Agents build on each other's work correctly
- **Efficiency:** No duplicate work or conflicting decisions
- **Traceability:** Full audit trail of multi-agent workflows
- **Quality:** Specialist agents handle tasks in their domain

---

## Core Coordination Patterns

### 1. Design → Implementation Pattern

**Use Case:** Architecture decisions followed by implementation

**Example:** ai-architecture-specialist → ai-engineer

```yaml
Workflow:
  Phase 1 (Design):
    Agent: ai-architecture-specialist
    Outputs:
      - ai_architecture_decisions
      - ai_model_config
      - ai_routing_algorithms
      - ai_performance_benchmarks

  Phase 2 (Implementation):
    Agent: ai-engineer
    Reads:
      - ai_architecture_decisions (design to implement)
      - ai_model_config (model routing to configure)
      - ai_performance_benchmarks (targets to meet)
    Writes:
      - ai_implementation_results
      - ai_code_patterns
      - ai_lessons_learned

Handoff Trigger:
  - ai-architecture-specialist completes design
  - User approves architecture
  - ai-engineer invoked with context reference
```

**MCP Coordination:**

```typescript
// ai-architecture-specialist completion
update_project_context(token, "ai_architecture_decisions", {
  proxy_architecture: "Multi-provider with fallback",
  model_selection: "Claude Sonnet for complex, GPT-3.5 for simple",
  caching_strategy: "Semantic cache with Redis",
  approved: true,
  timestamp: "2025-10-04T10:00:00Z"
});

// ai-engineer reads and implements
const architecture = view_project_context(token, "ai_architecture_decisions");
// Implement based on approved architecture...
update_project_context(token, "ai_implementation_results", {
  components_implemented: ["proxy_service", "cache_layer"],
  tests_passing: true,
  performance_validated: true
});
```

### 2. Implementation → Review Pattern

**Use Case:** Code written, needs quality assurance

**Example:** Any agent → code-reviewer

```yaml
Workflow:
  Phase 1 (Implementation):
    Agent: [any implementation agent]
    Outputs:
      - Code files modified/created
      - Implementation summary in context

  Phase 2 (Review):
    Agent: code-reviewer
    Reads:
      - All agent outputs (files, context)
      - code_review_standards
      - security_requirements
    Writes:
      - code_review_findings
      - security_vulnerabilities_log
      - code_review_lessons_learned

Handoff Trigger:
  - Implementation complete
  - User requests review OR
  - Automatic for high-risk changes (security, production)
```

**Review Invocation (Automatic):**

```typescript
// After implementation completes
if (isHighRisk(filesChanged) || userRequestedReview) {
  create_agent("code-reviewer-001", [task_id], ["code_review"], admin_token);
  update_project_context(token, "review_requirements", {
    files: filesChanged,
    focus: ["security", "performance"],
    severity_threshold: "medium"
  });
}

// code-reviewer checks requirements
const requirements = view_project_context(token, "review_requirements");
// Perform review...
update_project_context(token, "code_review_findings", {
  critical_issues: [],
  high_priority: ["Add input validation in auth handler"],
  approved: false  // Request fixes
});
```

### 3. Specialist Delegation Pattern

**Use Case:** General agent delegates to domain specialist

**Example:** frontend-developer → nextjs-architect (for complex Next.js issues)

```yaml
Workflow:
  Phase 1 (Initial Attempt):
    Agent: frontend-developer
    Detects: Complex Next.js-specific challenge beyond scope
    Decision: Delegate to specialist

  Phase 2 (Specialist Work):
    Agent: nextjs-architect
    Reads:
      - frontend_developer_context (problem description)
      - nextjs_architecture_decisions
    Writes:
      - nextjs_implementation_results
      - nextjs_lessons_learned

  Phase 3 (Integration):
    Agent: frontend-developer
    Reads:
      - nextjs_implementation_results
    Action: Integrate specialist's solution into broader work

Handoff Trigger:
  - Complexity threshold exceeded
  - Domain-specific expertise required
  - Performance optimization needed
```

**Delegation Example:**

```typescript
// frontend-developer recognizes limitation
update_project_context(token, "frontend_developer_context", {
  issue: "Server Components streaming with Suspense boundaries",
  complexity: "high",
  requires_specialist: "nextjs-architect",
  context: "Building dashboard with real-time data"
});

create_agent("nextjs-architect-001", [task_id], ["nextjs_streaming"], admin_token);

// nextjs-architect reads context and solves
const problem = view_project_context(token, "frontend_developer_context");
// Implement optimal Next.js pattern...
update_project_context(token, "nextjs_implementation_results", {
  pattern: "Parallel streaming with nested Suspense",
  code_location: "apps/web/app/dashboard/page.tsx",
  performance: "First byte <200ms, LCP <1s"
});
```

### 4. Parallel Specialist Pattern

**Use Case:** Multiple specialists work concurrently on independent tasks

**Example:** security-auditor + performance-engineer (comprehensive review)

```yaml
Workflow:
  Phase 1 (Task Distribution):
    Coordinator: Agent or System
    Creates: Multiple specialist agents in parallel

  Phase 2 (Parallel Execution):
    Agent 1: security-auditor
      Writes: security_vulnerabilities_log

    Agent 2: performance-engineer
      Writes: performance_optimization_report

  Phase 3 (Consolidation):
    Coordinator: Aggregates results
    Decision: Merge findings, prioritize actions

Handoff Trigger:
  - Large codebase review
  - Pre-production validation
  - Comprehensive audit required
```

**Parallel Coordination:**

```typescript
// Launch parallel agents
const securityTask = create_agent(
  "security-auditor-001",
  [task_id],
  ["security_audit"],
  admin_token
);

const perfTask = create_agent(
  "performance-engineer-001",
  [task_id],
  ["performance_audit"],
  admin_token
);

// Both agents work independently
// Security agent:
update_project_context(token, "security_vulnerabilities_log", {
  critical: ["SQL injection in user query"],
  high: ["Missing rate limiting"]
});

// Performance agent:
update_project_context(token, "performance_optimization_report", {
  bottlenecks: ["N+1 queries in dashboard"],
  recommendations: ["Add database indexes", "Implement caching"]
});

// Coordinator consolidates
const securityFindings = view_project_context(token, "security_vulnerabilities_log");
const perfFindings = view_project_context(token, "performance_optimization_report");

// Prioritize across domains
update_project_context(token, "consolidated_review", {
  critical_path: [
    "Fix SQL injection (security)",
    "Add database indexes (performance)"
  ]
});
```

---

## MCP Context Keys by Agent

### AI Domain

**ai-architecture-specialist:**

- **Writes:** ai_architecture_decisions, ai_model_config, ai_routing_algorithms
- **Reads:** ai_tech_stack, tech_stack_config
- **Coordinates With:** ai-engineer (design → implementation)

**ai-engineer:**

- **Writes:** ai_implementation_results, ai_code_patterns, ai_lessons_learned
- **Reads:** ai_architecture_decisions, ai_model_config, ai_performance_benchmarks
- **Coordinates With:** ai-architecture-specialist (receives design), code-reviewer (submits for review)

### Frontend Domain

**frontend-developer:**

- **Writes:** frontend_findings, frontend_lessons_learned
- **Reads:** frontend_patterns, design_system_tokens
- **Coordinates With:** nextjs-architect (delegates complex Next.js), code-reviewer (quality)

**nextjs-architect:**

- **Writes:** nextjs_implementation_results, nextjs_lessons_learned
- **Reads:** nextjs_architecture_decisions, frontend_developer_context
- **Coordinates With:** frontend-developer (receives delegation)

### Quality Assurance Domain

**code-reviewer:**

- **Writes:** code_review_findings, security_vulnerabilities_log, code_review_lessons_learned
- **Reads:** code_review_standards, security_requirements, performance_benchmarks
- **Coordinates With:** ALL agents (reviews their outputs)

**security-auditor:**

- **Writes:** security_vulnerabilities_log, security_lessons_learned
- **Reads:** security_requirements, code_review_standards
- **Coordinates With:** code-reviewer (security findings), devops-engineer (deployment security)

### Infrastructure Domain

**devops-engineer:**

- **Writes:** devops_findings, devops_lessons_learned
- **Reads:** devops_decisions, devops_patterns
- **Coordinates With:** k8s-infrastructure-expert (K8s deployment), security-auditor (secure deployments)

**k8s-infrastructure-expert:**

- **Writes:** k8s_infrastructure_decisions, k8s_deployment_patterns
- **Reads:** devops_decisions, infrastructure_requirements
- **Coordinates With:** devops-engineer (receives K8s tasks), argocd-gitops-expert (GitOps integration)

---

## Coordination Anti-Patterns (Avoid These)

### ❌ Context Pollution

**Problem:** Agent writes to another agent's primary context keys

```typescript
// BAD: ai-engineer writing to ai-architecture-specialist's domain
update_project_context(token, "ai_architecture_decisions", {
  // This should be architect's decision, not engineer's!
});
```

**Solution:** Use domain-specific keys or coordination keys

```typescript
// GOOD: ai-engineer provides feedback without overwriting
update_project_context(token, "ai_implementation_feedback", {
  architecture_issue: "Caching strategy needs adjustment for scale",
  suggested_revision: "Add distributed cache layer"
});
```

### ❌ Coordination Loops

**Problem:** Agents endlessly delegate back and forth

```yaml
# BAD:
Agent A → delegates to → Agent B
Agent B → delegates back to → Agent A
Agent A → delegates to → Agent B
# Infinite loop!
```

**Solution:** Define clear ownership and escalation paths

```yaml
# GOOD:
frontend-developer → (delegates complex Next.js) → nextjs-architect
nextjs-architect → (completes) → frontend-developer (integrates)
# Clean handoff, no loops
```

### ❌ Silent Failures

**Problem:** Agent encounters error but doesn't communicate to coordinator

**Solution:** Always update context with status, even on failure

```typescript
// GOOD: Communicate failure clearly
update_project_context(token, "ai_implementation_results", {
  status: "failed",
  error: "Unable to connect to vector database",
  requires_intervention: true,
  suggested_action: "Check database credentials"
});
```

### ❌ Timestamp Conflicts

**Problem:** Agents overwrite each other's updates without checking recency

**Solution:** Use bulk updates or check timestamps before writing

```typescript
// GOOD: Check before overwriting
const currentContext = view_project_context(token, "ai_architecture_decisions");
if (currentContext.timestamp > myLastRead) {
  // Context was updated by another agent, merge carefully
  mergeContexts(currentContext, myUpdates);
}
```

---

## Quality Gates for Coordination

### Before Delegating to Another Agent

- [ ] Clear problem definition written to context
- [ ] All necessary context keys populated
- [ ] Acceptance criteria defined
- [ ] Expected completion time estimated
- [ ] Rollback plan if specialist fails

### Before Completing as Specialist

- [ ] Original requirements read from context
- [ ] Solution implemented and tested
- [ ] Results written to expected context keys
- [ ] Lessons learned captured for future work
- [ ] Coordinator agent notified (implicitly via context update)

### Before Consolidating Multi-Agent Results

- [ ] All parallel agents completed successfully
- [ ] No conflicting recommendations
- [ ] Priorities established across domains
- [ ] Consolidated plan coherent and actionable

---

## Troubleshooting Coordination Issues

### Symptom: Agents produce conflicting recommendations

**Diagnosis:**

```typescript
// Check for conflicts in context
const aiDecisions = view_project_context(token, "ai_architecture_decisions");
const securityRequirements = view_project_context(token, "security_requirements");

if (aiDecisions.caching === "client-side" &&
    securityRequirements.pii_handling === "server-only") {
  // Conflict detected!
}
```

**Resolution:**

- Establish priority: Security > Performance > Developer Experience
- Create coordination context key to resolve
- Update both agents' recommendations

### Symptom: Agent doesn't find expected context

**Diagnosis:**

```typescript
const context = view_project_context(token, "expected_key");
// Returns null or empty
```

**Resolution:**

- Check context key naming convention
- Verify previous agent completed successfully
- Use `ask_project_rag` to find alternative sources

### Symptom: Circular delegation

**Diagnosis:** Agent A calls Agent B, Agent B calls Agent A

**Resolution:**

- Define clear specialization boundaries
- Implement delegation depth limit (max 2 levels)
- Create escalation path to human for complex cases

---

## Future Enhancements

### Planned Improvements

1. **Automated Coordination Graph**
   - Visualize agent dependencies
   - Detect coordination patterns
   - Identify optimization opportunities

2. **Context Version Control**
   - Track context key changes over time
   - Rollback to previous agent decisions
   - Audit trail for compliance

3. **Agent Performance Metrics**
   - Coordination success rate
   - Average delegation depth
   - Context key utilization

4. **Smart Agent Selection**
   - Automatically choose best agent for task
   - Consider agent availability and performance
   - Load balancing across specialists

---

## Summary

**Key Principles:**

1. **Clear Ownership:** Each context key has a primary owner agent
2. **Explicit Handoffs:** Delegation is visible in context updates
3. **Graceful Failures:** Agents communicate errors clearly
4. **Audit Trail:** Full history of multi-agent workflows

**Coordination Workflow:**

1. Agent A completes work → updates context
2. Agent A determines if delegation needed
3. If yes: Agent A creates delegation context → creates Agent B
4. Agent B reads delegation context → completes work → updates results
5. Agent A (or coordinator) reads results → integrates or escalates

**Success Metrics:**

- 95% of multi-agent workflows complete without human intervention
- <5% coordination conflicts requiring resolution
- Full audit trail for all agent interactions
