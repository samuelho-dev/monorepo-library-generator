---
"@samuelho-dev/monorepo-library-generator": minor
---

feat: comprehensive Effect.ts patterns audit implementation

**Phase 1: Documentation & Decision Guides**
- Added control flow decision matrix (Effect.if/when/unless) to EFFECT_PATTERNS.md
- Added Effect.all batch operations guide with concurrency patterns
- Expanded Effect running patterns section with clear decision matrix
- Added Effect.all examples to feature service template

**Phase 2: Production Patterns - Stream & Templates**

**Phase 2.1: Stream Patterns**
- Added `streamAll` method to repository interface template
- Implemented `streamAll` in Live, Test, and Dev layers with Stream.paginateEffect
- Added comprehensive streamAll test examples to repository spec template
- Fixed test mocks to use DatabaseService abstraction (not Kysely internals)

**Phase 2.2: Queue Patterns**
- Queue patterns already comprehensive in infrastructure template and EFFECT_PATTERNS.md
- No changes needed (already production-ready)

**Phase 2.3: Observability**
- Added comprehensive Effect.tap success-path observability section to feature service template
- Includes 4 patterns: logging, chaining observability, conditional observability, analytics
- Clear guidance on when to use Effect.tap vs Effect.tapError

**Phase 2.4: Decision Matrices**
- Added 400+ line "Decision Matrices & Quick Reference" section to EFFECT_PATTERNS.md
- Master decision trees for 6 categories (single values, multiple values, conditionals, resources, concurrency, data)
- Quick reference tables for all Effect operators
- Pattern selection flowchart
- Anti-pattern recognition guide with 9 common examples
- Decision matrices for Stream/Array/Queue and Layer patterns
- Common use case → pattern mapping table

**Impact:**
- Developers can now quickly find the right Effect pattern for any use case
- Generated repositories include Stream support for large datasets out of the box
- Comprehensive test examples for all new patterns
- Production-ready Queue patterns documented and ready to use
