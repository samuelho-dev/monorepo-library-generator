# MCP Integration Template

This template provides standardized MCP (Model Context Protocol) integration documentation for Claude Code agents. Use variable substitution to customize for each agent's domain.

## Variables

Replace these placeholders when applying this template:

- `{{DOMAIN}}` - Agent's domain (e.g., "ai", "frontend", "security", "nx_monorepo")
- `{{PHASE}}` - Work phase (e.g., "Work", "Design", "Implementation", "Review")
- `{{TYPE}}` - Context type (e.g., "decisions", "standards", "requirements", "patterns")

## Template Content

---

## Agent-MCP Integration

You are operating within the Agent-MCP multi-agent framework. Use these MCP tools for {{DOMAIN}} coordination:

### Context Management Workflow

**Pre-{{PHASE}}:**

1. Check existing {{DOMAIN}} {{TYPE}} and past decisions
   - `view_project_context(token, "{{DOMAIN}}_decisions")` - Check past decisions
   - `view_project_context(token, "{{DOMAIN}}_patterns")` - Review established patterns
   - `view_project_context(token, "{{DOMAIN}}_config")` - Check configuration settings
   - `view_project_context(token, "{{DOMAIN}}_requirements")` - Understand requirements

2. Query knowledge base for {{DOMAIN}} patterns
   - `ask_project_rag("{{DOMAIN}} implementation examples in this codebase")` - Find existing implementations
   - `ask_project_rag("{{DOMAIN}} error handling patterns")` - Learn error handling approaches
   - `ask_project_rag("{{DOMAIN}} best practices")` - Discover best practices
   - `ask_project_rag("{{DOMAIN}} architecture decisions")` - Review architectural choices

3. Store {{DOMAIN}} results and findings
   - `update_project_context(token, "{{DOMAIN}}_findings", {...})` - Document discovered issues
   - `update_project_context(token, "{{DOMAIN}}_lessons_learned", {...})` - Capture improvement insights
   - `update_project_context(token, "{{DOMAIN}}_implementation_results", {...})` - Record implementation outcomes
   - `bulk_update_project_context(token, [...])` - Batch update multiple related contexts

### Agent Coordination

When specialized {{DOMAIN}} work requires coordination:

- `create_agent("{{DOMAIN}}-specialist-001", [task_ids], ["{{DOMAIN}}_tasks"], admin_token)` - Delegate specialized work
- `assign_task(task_id, "{{DOMAIN}}-specialist-001", admin_token)` - Assign specific tasks
- Store requirements: `update_project_context(token, "{{DOMAIN}}_task_requirements", {...})`
- Check results: `view_project_context(token, "{{DOMAIN}}_task_results")`

### Context Keys This Agent Manages

**Reads:**

- `{{DOMAIN}}_decisions` - Past architectural and implementation decisions
- `{{DOMAIN}}_patterns` - Established patterns and conventions
- `{{DOMAIN}}_config` - Configuration settings and standards
- `{{DOMAIN}}_requirements` - Current requirements and specifications
- `{{DOMAIN}}_tech_stack` - Technology stack and dependencies
- `tech_stack_config` - Overall project technology configuration

**Writes:**

- `{{DOMAIN}}_findings` - Issues discovered during work
- `{{DOMAIN}}_lessons_learned` - Patterns and improvement opportunities identified
- `{{DOMAIN}}_implementation_results` - Completed implementation details
- `{{DOMAIN}}_decisions` - New decisions made during work
- `{{DOMAIN}}_patterns` - Reusable patterns discovered or created
- `{{DOMAIN}}_performance_metrics` - Performance data and benchmarks

### RAG Query Patterns

Typical queries for {{DOMAIN}} domain knowledge:

- "Find existing {{DOMAIN}} implementation patterns in this project"
- "Show me {{DOMAIN}} error handling examples from the codebase"
- "What are the {{DOMAIN}} best practices established in this project?"
- "How is {{DOMAIN}} testing implemented in this codebase?"
- "What {{DOMAIN}} libraries and frameworks are currently in use?"
- "Find examples of {{DOMAIN}} integration with [specific technology]"

## Communication & Progress Reporting

**Updates:** Provide fact-based progress reports ("Analyzed X files. Found Y issues in Z components")
**State Management:** Persist work sessions as `{{DOMAIN}}_session_{timestamp}` for complex tasks
**Tool Transparency:** Announce tool operations explicitly ("Querying {{DOMAIN}}_patterns for consistency...")
**Context Recovery:** After interruptions, restore state via `{{DOMAIN}}_decisions` + `ask_project_rag` queries

---

## Usage Examples

### Example 1: AI Engineer Domain

```markdown
Replace:
- {{DOMAIN}} → ai
- {{PHASE}} → Implementation
- {{TYPE}} → requirements

Result:
**Pre-Implementation:**
1. Check existing ai requirements and past decisions
   - `view_project_context(token, "ai_decisions")` - Check past decisions
   - `view_project_context(token, "ai_patterns")` - Review established patterns
```

### Example 2: Frontend Developer Domain

```markdown
Replace:
- {{DOMAIN}} → frontend
- {{PHASE}} → Development
- {{TYPE}} → standards

Result:
**Pre-Development:**
1. Check existing frontend standards and past decisions
   - `view_project_context(token, "frontend_decisions")` - Check past decisions
   - `view_project_context(token, "frontend_patterns")` - Review established patterns
```

### Example 3: Security Auditor Domain

```markdown
Replace:
- {{DOMAIN}} → security
- {{PHASE}} → Audit
- {{TYPE}} → requirements

Result:
**Pre-Audit:**
1. Check existing security requirements and past decisions
   - `view_project_context(token, "security_decisions")` - Check past decisions
   - `view_project_context(token, "security_patterns")` - Review established patterns
```

## Customization Guidelines

### When to Customize

- **Domain-specific context keys:** Add specialized keys relevant to the agent's domain
- **Specialized RAG queries:** Include domain-specific query examples
- **Unique coordination patterns:** Document agent-specific collaboration workflows
- **Domain terminology:** Adjust language to match domain conventions

### What to Keep Consistent

- Overall structure and section organization
- MCP tool function names and signatures
- Communication and progress reporting guidelines
- Context management workflow phases

### Validation Checklist

Before applying this template to an agent:

- [ ] All `{{DOMAIN}}` placeholders replaced with appropriate domain
- [ ] All `{{PHASE}}` placeholders replaced with agent's primary work phase
- [ ] All `{{TYPE}}` placeholders replaced with appropriate context type
- [ ] Context keys aligned with agent's actual read/write patterns
- [ ] RAG query examples relevant to agent's domain
- [ ] Agent coordination examples match actual delegation patterns
- [ ] Communication guidelines preserved from template
