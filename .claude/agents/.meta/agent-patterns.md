# Agent Design Patterns Extracted from agent-architect.md

## Core Structural Patterns

### 1. YAML Frontmatter Structure

```yaml
---
name: agent-name
description: |
  Use this agent when [clear criteria]. This includes:

  - [Specific use case 1]
  - [Specific use case 2]
  - [Specific use case 3]

  Examples:

  <example>
  Context: [Contextual setup]
  user: "[User query]"
  assistant: "[Agent response with tool use]"
  <commentary>
  [Why this agent is appropriate]
  </commentary>
  </example>

  [2-4 more examples with varied scenarios]
model: sonnet|opus|haiku
color: pink|yellow|blue|green (optional)
---
```

### 2. Opening Persona Statement

```markdown
You are an elite [ROLE] with [LEVEL] expertise in [DOMAIN]. Your [CHARACTERISTIC] encompasses [SCOPE].
```

**Pattern:**

- Use "elite", "expert", "master", "specialist" for authority
- Second person voice ("You are...")
- Specific domain focus
- Mention both theoretical and practical expertise

### 3. XML Tag Hierarchy for Organization

**Primary Tags:**

```xml
<role>
Core purpose and identity
</role>

<responsibility type="primary">
Main responsibility
</responsibility>

<responsibility type="analysis">
Analytical duties
</responsibility>

<workflow phase="discovery">
Multi-step workflow
</workflow>

<quality-gates>
Standards and validation
</quality-gates>

<decision-framework type="consolidation">
Decision-making criteria
</decision-framework>

<deliverable-structure>
Output format expectations
</deliverable-structure>

<meta-learning>
Self-improvement mechanisms
</meta-learning>
```

### 4. Workflow Section Pattern

```markdown
<workflow phase="phase-name">
### Phase N: Descriptive Title

**Step 1: Action Name**
```yaml
Description of what to do:
  1. Specific action with tool/command
  2. Expected outcome
  3. Decision criteria
```

**Step 2: Next Action**
[Repeat pattern]
</workflow>

```

### 5. Example Structure (Concrete Over Abstract)

**Good Example Pattern:**
```markdown
**Example: Well-Defined Domain**
```yaml
Agent: agent-name
Domain: Specific expertise area
Tool Ownership: Exclusive tools
Input: Expected input format
Output: Expected output format
Expertise: Domain-specific methodologies
```

```

**Anti-Pattern Example:**
```markdown
**Anti-Pattern: Over-Broad Domain**
```yaml
❌ Agent: generic-expert
Domain: Everything (too broad)
Problem: Leads to shallow expertise
```

```

### 6. Actionable Instructions Pattern

**Principles:**
- ✅ "Run unit tests with `nx test {lib}` and verify all tests pass"
- ❌ "Ensure code quality through thorough testing"

**Structure:**
1. Command/action
2. Expected verification
3. Success criteria

### 7. Decision Framework Pattern

```markdown
<decision-framework type="decision-type">
### When to [Action] (Data-Driven)

**Quantitative Criteria (ALL must be true):**
1. **Metric A**: >70% threshold
2. **Metric B**: >50% of tasks involve X
3. **Usage Pattern**: Combined usage <20 tasks/week

**Qualitative Assessment:**
- Natural synergy exists
- No conflicting methodologies
- User workflow simplified

**Example [Action] Candidate:**
```yaml
Current State: Description
Metrics: Specific numbers
Decision: ✅ [ACTION] with rationale
Expected Improvement: Quantified prediction
```

</decision-framework>
```

### 8. MCP Integration Section

```markdown
## Agent-MCP Integration

You are operating within the Agent-MCP multi-agent framework. Use these MCP tools for [domain] coordination:

### Context Management Workflow

**Pre-[Work Type]:**
1. Check existing [domain] and decisions
   - `view_project_context(token, "[domain]_decisions")` - Review past choices
   - `view_project_context(token, "[domain]_config")` - Check current state

2. Query knowledge base for [domain] patterns
   - `ask_project_rag("[domain] implementation in this codebase")` - Find existing code
   - `ask_project_rag("[specific pattern]")` - Learn strategies

3. Store [domain] decisions
   - `update_project_context(token, "[domain]_decisions", {...})` - Document choices
   - `bulk_update_project_context(token, [...])` - Batch updates

### Context Keys This Agent Manages

**Reads:**
- `[domain]_decisions` - [Description]
- `[domain]_patterns` - [Description]
- `[domain]_config` - [Description]

**Writes:**
- `[domain]_findings` - [Description]
- `[domain]_improvements` - [Description]
- `[domain]_lessons_learned` - [Description]

### RAG Query Patterns

Typical queries for [domain] knowledge:
- "Find existing [pattern] implementations"
- "Show me [specific] examples"
- "What [config] is configured in this project?"

## Communication & Progress Reporting

**Updates:** Provide fact-based progress reports ("Analyzed X files. Found Y issues in Z components")
**State Management:** Persist work sessions as `[agent_name]_session_{timestamp}` for complex tasks
**Tool Transparency:** Announce tool operations explicitly ("Querying [agent_name]_patterns for consistency...")
**Context Recovery:** After interruptions, restore state via `[agent_name]_decisions` + `ask_project_rag` queries
```

## Key Principles from Research

### Token Optimization

- **Target**: 1500-2500 tokens per agent (sweet spot)
- **Minimum**: 1000 tokens (adequate for simple specialists)
- **Maximum**: 3000 tokens (lightweight for orchestration)
- **Exception**: Meta-agents can exceed if justified

### Clarity Over Comprehensiveness

- Concrete examples > Abstract principles
- Actionable instructions > Aspirational goals
- Specific commands > Generic advice
- YAML/code blocks > Prose descriptions

### Trigger Pattern Design

- Include 3-5 `<example>` blocks in description
- Each example: context + user + assistant + commentary
- Show proactive triggering scenarios
- Demonstrate complex multi-step delegations

### XML Structure Benefits (Claude-specific)

- Claude processes `<tag>content</tag>` more accurately than markdown headers
- Use for primary organizational structure
- Nest for hierarchical information
- Tag types as attributes: `<responsibility type="primary">`

### Second Person Advantage

- "You are..." triggers persona activation
- "Your responsibilities..." creates ownership
- Maintain throughout entire prompt
- Avoid third-person descriptions

### Quality Gates

Every agent should include:

- [ ] Self-verification checklist
- [ ] Quality standards section
- [ ] Success criteria definition
- [ ] Error handling guidance
- [ ] Edge case considerations

## Common Anti-Patterns to Avoid

### 1. Vague Instructions

❌ "Ensure quality code"
✅ "Run `nx lint {lib}` and fix all errors before committing"

### 2. Over-Broad Domain

❌ "Expert in all databases"
✅ "PostgreSQL specialist focusing on Kysely type-safe queries"

### 3. Missing Examples

❌ Only abstract description
✅ 3-5 concrete examples with real scenarios

### 4. No Structure

❌ Wall of text markdown
✅ XML-organized sections with clear hierarchy

### 5. Passive Voice

❌ "Code should be reviewed for quality"
✅ "You review code for security vulnerabilities and performance issues"

### 6. Abstract Metrics

❌ "Improve performance"
✅ "Reduce p90 latency from 500ms to <200ms"

### 7. Missing Context Integration

❌ No MCP tools mentioned
✅ Clear pre-work, context keys, and RAG patterns

## Template Selection Guide

**Use Simple Template when:**

- Narrow, well-defined domain
- Single primary responsibility
- Minimal decision-making required
- Target: ~1000-1500 tokens

**Use Standard Template when:**

- Moderate complexity domain
- Multiple related responsibilities
- Some architectural decisions
- Target: ~1500-2500 tokens

**Use Complex Template when:**

- Broad expertise required
- Multi-phase workflows
- Heavy decision-making
- Meta-level coordination
- Target: ~2500-3000 tokens

**Use Meta Template when:**

- Self-improvement agent
- Ecosystem coordination
- Performance tracking
- Exception: Can exceed 3000 tokens
