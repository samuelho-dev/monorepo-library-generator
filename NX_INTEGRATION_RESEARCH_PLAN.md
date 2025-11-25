# Nx Integration Research Plan

> **Project**: @samuelho-dev/monorepo-library-generator  
> **Goal**: Research opportunities to deepen Nx integration while maintaining workspace-agnostic architecture  
> **Status**: Planning Phase  
> **Date**: 2025-11-25

---

## Executive Summary

This research plan outlines how to enhance Nx integration for the monorepo library generator while preserving its workspace-agnostic design philosophy. The generator currently works as both a standalone CLI tool and an Nx generator, but there are significant opportunities to leverage Nx's advanced features.

### Current State

**✅ What Works Today:**
- Dual interfaces: Standalone CLI (`@effect/cli`) + Nx generators (`@nx/devkit`)
- Thin Nx wrapper pattern around shared Effect-based cores
- Basic Tree API usage for file operations
- Generator discovery via `generators.json`
- Schema validation with Nx standards
- Integration with Nx workspace detection

**🎯 Integration Opportunity Areas:**
1. Generator capabilities and user experience
2. Plugin architecture and tooling ecosystem
3. Schema enhancements and validation
4. Project graph integration
5. Testing infrastructure
6. Nx Cloud optimization
7. Generator composition patterns

---

## Research Areas

### 1. Nx Generator Capabilities

**Goal**: Understand advanced generator features not currently utilized

#### Research Topics

##### 1.1 Interactive Prompts
- **Current**: Basic schema with `x-prompt` for simple text inputs
- **Research**: Advanced prompt types and conditional prompting
  - Multi-select prompts for features
  - Autocomplete for existing projects
  - Dynamic validation with async checks
  - Conditional field visibility based on previous answers

**Questions to Answer:**
- How to implement autocomplete for selecting existing contract libraries when generating data-access?
- Can we validate project names against existing workspace structure during prompt?
- How to create wizard-like flows for complex generator scenarios?

**Documentation References:**
- [Nx Generator Schema](https://nx.dev/extending-nx/recipes/generator-options)
- [Advanced Prompts](https://nx.dev/extending-nx/recipes/prompts)

---

##### 1.2 Dry-Run and Preview Mode
- **Current**: Immediate file generation without preview
- **Research**: Implementing comprehensive dry-run capabilities
  - Show file tree preview before generation
  - Display file diffs for modifications
  - Rollback mechanisms for failed generations
  - Interactive confirmation for destructive operations

**Questions to Answer:**
- How to show a preview of all files that will be generated?
- Can we integrate with Nx's dry-run flag natively?
- How to handle Effect's file system abstraction in dry-run mode?

**Implementation Considerations:**
- Need to buffer all file operations in memory during dry-run
- Create visual diff display for modified files
- Integrate with existing `FileSystemAdapter` abstraction

---

##### 1.3 Workspace Manipulation APIs
- **Current**: Basic file generation with `tree.write()`
- **Research**: Advanced workspace operations
  - `updateJson()` for safer JSON updates
  - `addProjectConfiguration()` for project.json
  - `generateFiles()` with template interpolation
  - `addDependenciesToPackageJson()` for dependency management
  - `visitNotIgnoredFiles()` for workspace scanning

**Questions to Answer:**
- Should we migrate from manual JSON manipulation to Nx's type-safe APIs?
- How to better integrate with Nx's project configuration system?
- Can we leverage Nx's built-in template engine instead of custom templates?

**Code Example (Current vs. Potential):**
```typescript
// Current: Manual JSON manipulation
const packageJson = JSON.parse(tree.read('package.json', 'utf-8'));
packageJson.dependencies['new-dep'] = '^1.0.0';
tree.write('package.json', JSON.stringify(packageJson, null, 2));

// Potential: Nx APIs
import { addDependenciesToPackageJson } from '@nx/devkit';
addDependenciesToPackageJson(tree, { 'new-dep': '^1.0.0' }, {});
```

---

##### 1.4 Generator Lifecycle Hooks
- **Current**: Single-phase generation with post-generation callback
- **Research**: Multi-phase generation with hooks
  - Pre-validation phase
  - File generation phase
  - Post-generation hooks (formatting, linting)
  - Custom task scheduling

**Questions to Answer:**
- Can we break generation into validation → scaffold → customize phases?
- How to run generators as tasks in the task graph?
- Should we add pre-flight validation for workspace compatibility?

---

### 2. Nx Plugin Architecture

**Goal**: Evaluate creating a full-featured Nx plugin

#### Research Topics

##### 2.1 Plugin Structure
- **Current**: Generator-only package with `generators.json`
- **Research**: Complete plugin architecture
  - Plugin manifest (`package.json` extensions)
  - Executors for build/test/deploy tasks
  - Migrations for version upgrades
  - Project graph plugins
  - Workspace generators

**Questions to Answer:**
- Should we create separate `@samuelho-dev/nx-plugin` package or enhance current one?
- What executors would be valuable? (e.g., `build-effect-library`, `test-effect-layer`)
- How to version and distribute migrations?

**Documentation References:**
- [Creating an Nx Plugin](https://nx.dev/extending-nx/tutorials/create-plugin)
- [Plugin Structure](https://nx.dev/extending-nx/recipes/create-plugin)

---

##### 2.2 Custom Executors
- **Research**: Build tooling specific to Effect-based libraries
  - `effect-build` executor for optimized Effect compilation
  - `effect-test` executor with Layer composition testing
  - `effect-lint` executor for Effect best practices
  - `bundle-analyze` executor for tree-shaking validation

**Potential Executors:**

1. **`@samuelho-dev/nx-plugin:build-effect`**
   ```json
   {
     "executor": "@samuelho-dev/nx-plugin:build-effect",
     "options": {
       "outputPath": "dist/libs/feature/payment",
       "main": "src/index.ts",
       "effectOptimizations": true,
       "platformExports": ["server", "client", "edge"]
     }
   }
   ```

2. **`@samuelho-dev/nx-plugin:test-layers`**
   ```json
   {
     "executor": "@samuelho-dev/nx-plugin:test-layers",
     "options": {
       "testPathPattern": "src/**/*.spec.ts",
       "validateLayerComposition": true
     }
   }
   ```

**Questions to Answer:**
- Do Effect libraries need specialized build steps beyond standard TypeScript compilation?
- Can we validate Layer composition at build time?
- Should we provide custom test runners optimized for Effect testing patterns?

---

##### 2.3 Migration Scripts
- **Research**: Automated upgrade paths for breaking changes
  - Version migrations (v1 → v2 schema changes)
  - Codemods for API updates
  - Workspace migrations for new features
  - Dependency version bumps

**Example Migration Scenarios:**
- Migrating from old Layer naming conventions to standardized names
- Updating import paths when refactoring library structure
- Converting manual TypeScript path aliases to pnpm workspaces

**Questions to Answer:**
- How to create reversible migrations?
- Can we provide dry-run for migrations?
- How to handle partial migration failures?

**Documentation References:**
- [Workspace Migrations](https://nx.dev/extending-nx/recipes/migrations)

---

##### 2.4 Project Graph Plugins
- **Research**: Custom dependency analysis for Effect patterns
  - Detect Layer dependencies automatically
  - Validate architectural boundaries (contract → data-access → feature)
  - Trace Effect.Tag usage across libraries
  - Build visualization of Layer composition graph

**Potential Features:**
- Automatically add TypeScript project references based on Effect imports
- Detect missing Layer dependencies at graph level
- Validate that contract libraries don't import implementation libraries

**Questions to Answer:**
- Can we parse Effect.Tag usage to build dependency graph?
- How to integrate custom rules into Nx's enforce-module-boundaries?
- Can we generate dependency diagrams specific to Layer composition?

---

### 3. Schema Enhancements

**Goal**: Leverage advanced Nx schema features for better UX

#### Research Topics

##### 3.1 Advanced Validation
- **Current**: Basic pattern matching and required fields
- **Research**: Runtime validation and cross-field validation
  - Validate contract library exists before generating data-access
  - Check for naming conflicts with existing projects
  - Validate platform combinations (e.g., edge requires certain dependencies)
  - Async validation (check npm registry for external service packages)

**Example Validations:**
```typescript
// Validate contract exists when generating data-access
{
  "name": "contractName",
  "type": "string",
  "x-validator": "validateContractExists"
}

// Ensure no naming conflicts
{
  "name": "name",
  "type": "string",
  "x-validator": "validateUniqueProjectName"
}
```

**Questions to Answer:**
- How to implement custom validators in Nx schemas?
- Can we provide helpful error messages with suggested fixes?
- Should validation be synchronous or asynchronous?

---

##### 3.2 Conditional Schema Fields
- **Research**: Dynamic schema based on user choices
  - Show `entities` field only if contract type selected
  - Show `externalService` field only for provider generator
  - Conditionally require fields based on platform selection

**Example Conditional Logic:**
```json
{
  "properties": {
    "platform": {
      "type": "string",
      "enum": ["node", "browser", "universal", "edge"]
    },
    "includeEdgeMiddleware": {
      "type": "boolean",
      "x-condition": "platform === 'edge' || platform === 'universal'"
    }
  }
}
```

**Questions to Answer:**
- Does Nx support conditional schema fields natively?
- How to implement this without Nx native support?
- Can we show/hide prompts based on previous answers?

---

##### 3.3 Autocomplete and Suggestions
- **Research**: Intelligent field suggestions
  - Autocomplete existing project names for dependencies
  - Suggest related libraries (e.g., matching contract when generating data-access)
  - Provide common platform combinations
  - Suggest tags based on workspace conventions

**Example Autocomplete:**
```json
{
  "contractName": {
    "type": "string",
    "x-prompt": "Which contract library should this implement?",
    "x-autocomplete": "getContractLibraries"
  }
}
```

**Questions to Answer:**
- How to query workspace for existing projects during prompt?
- Can we provide fuzzy search for project names?
- How to cache workspace structure for performance?

---

### 4. Project Graph Integration

**Goal**: Deeply integrate with Nx project graph for dependency management

#### Research Topics

##### 4.1 Automatic Dependency Detection
- **Current**: Manual dependency specification via schema
- **Research**: Automatic detection and suggestion
  - Scan imports to suggest missing dependencies
  - Detect circular dependencies before they happen
  - Auto-add TypeScript project references
  - Validate dependency constraints

**Questions to Answer:**
- Can we analyze generated code to detect required dependencies?
- How to suggest optional dependencies based on features?
- Should we auto-add dependencies or require explicit confirmation?

---

##### 4.2 Affected Commands Integration
- **Research**: Optimize for Nx affected command behavior
  - Ensure `nx affected` works correctly after generation
  - Tag projects appropriately for affected detection
  - Set up proper implicit dependencies
  - Configure task dependencies

**Questions to Answer:**
- How do generated libraries affect task execution order?
- Should we configure implicit dependencies for generated files?
- How to ensure new libraries are included in affected graph immediately?

---

##### 4.3 Dependency Graph Visualization
- **Research**: Custom visualizations for Effect architecture
  - Show Layer dependency graph
  - Visualize contract → implementation relationships
  - Display platform-specific dependency paths
  - Highlight architectural violations

**Potential Feature:**
```bash
nx graph --focus=feature-payment --show-layers
# Shows Layer composition hierarchy for payment feature
```

**Questions to Answer:**
- Can we extend `nx graph` with custom views?
- How to visualize Effect-specific relationships?
- Should we provide CLI commands for architecture validation?

---

### 5. Testing Infrastructure

**Goal**: Implement comprehensive testing patterns for Nx generators

#### Research Topics

##### 5.1 Generator Testing
- **Current**: Basic spec files with minimal coverage
- **Research**: Comprehensive test patterns
  - Virtual workspace testing (in-memory trees)
  - Snapshot testing for generated files
  - Integration tests with real workspace
  - Test utilities for common assertions

**Example Test Structure:**
```typescript
import { Tree, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

describe('contract generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate contract library with correct structure', async () => {
    await contractGenerator(tree, { name: 'product' });
    
    expect(tree.exists('libs/contract/product/src/index.ts')).toBe(true);
    
    const config = readProjectConfiguration(tree, 'contract-product');
    expect(config.tags).toContain('type:contract');
  });

  it('should create entities directory when entities option provided', async () => {
    await contractGenerator(tree, { 
      name: 'product',
      entities: 'Product,ProductCategory'
    });
    
    expect(tree.exists('libs/contract/product/src/lib/entities/product.ts')).toBe(true);
    expect(tree.exists('libs/contract/product/src/lib/entities/product-category.ts')).toBe(true);
  });
});
```

**Questions to Answer:**
- How to test workspace manipulation without affecting real workspace?
- Can we snapshot test large file structures efficiently?
- How to test generator composition (generating dependent libraries)?

**Documentation References:**
- [Testing Generators](https://nx.dev/extending-nx/recipes/test-generators)

---

##### 5.2 Integration Testing
- **Research**: End-to-end testing with real workspaces
  - Create test workspaces programmatically
  - Test full generation flows
  - Validate that generated code compiles
  - Test that generated tests pass

**Questions to Answer:**
- Should we maintain fixture workspaces for testing?
- How to test that generated libraries integrate correctly?
- Can we automate testing the generated examples?

---

##### 5.3 Regression Testing
- **Research**: Ensure changes don't break existing functionality
  - Golden file testing for templates
  - Visual regression for file structure
  - API compatibility testing
  - Performance regression detection

---

### 6. Nx Cloud Optimization

**Goal**: Optimize for Nx Cloud distributed execution and caching

#### Research Topics

##### 6.1 Remote Caching Configuration
- **Research**: Configure generated projects for optimal caching
  - Define proper inputs/outputs for cache keys
  - Configure named inputs for different file types
  - Set up appropriate cache strategies

**Example Configuration:**
```json
{
  "namedInputs": {
    "effect-source": [
      "{projectRoot}/src/**/*.ts",
      "!{projectRoot}/src/**/*.spec.ts"
    ]
  },
  "targetDefaults": {
    "build": {
      "inputs": ["effect-source", "^effect-source"],
      "outputs": ["{workspaceRoot}/dist/{projectRoot}"]
    }
  }
}
```

**Questions to Answer:**
- What are the optimal inputs/outputs for Effect-based libraries?
- How to configure caching for platform-specific builds?
- Should we provide Nx Cloud-specific optimization flags?

---

##### 6.2 Distributed Task Execution
- **Research**: Optimize task distribution
  - Configure parallel execution strategies
  - Set up proper task dependencies
  - Optimize for distributed builds

**Questions to Answer:**
- How to configure optimal parallelism for generated projects?
- Can we provide DTE-specific optimizations?
- What's the optimal task graph for Effect libraries?

---

### 7. Generator Composition

**Goal**: Enable composing multiple generators together

#### Research Topics

##### 7.1 Generator Chaining
- **Research**: Call generators from within generators
  - Generate contract → then data-access → then feature
  - Share context between chained generators
  - Handle failures in multi-generator flows

**Example Use Case:**
```bash
nx g @samuelho-dev:full-domain product \
  --with-data-access \
  --with-feature \
  --entities=Product,ProductCategory
```

This would:
1. Generate contract library with entities
2. Generate data-access library implementing contract
3. Generate feature library using data-access

**Questions to Answer:**
- How to pass context between generators?
- Should we use Nx's `runTasksInSerial` for sequencing?
- How to handle partial failures in chains?

---

##### 7.2 Workspace Generators
- **Research**: Generate workspace-specific generators
  - Create custom generators per workspace
  - Override default templates
  - Add workspace-specific validation

**Questions to Answer:**
- Should we generate a workspace-generators folder?
- How to allow customization without forking?
- Can we provide extension points for custom logic?

---

### 8. Additional Integration Opportunities

#### 8.1 Code Generation Enhancements
- **Research**: Smarter code generation
  - Analyze existing code to suggest ports/methods
  - Generate RPC schemas from OpenAPI specs
  - Import entity definitions from database schema
  - Generate GraphQL resolvers from contract ports

#### 8.2 Migration from Other Patterns
- **Research**: Migrate existing code to Effect patterns
  - Convert Promise-based code to Effect
  - Migrate Redux to Jotai + Effect
  - Convert Express routes to RPC endpoints

#### 8.3 Documentation Generation
- **Research**: Auto-generate documentation
  - Extract API docs from Effect.Tag interfaces
  - Generate architecture diagrams from project graph
  - Create integration guides for generated libraries

---

## Implementation Priority Matrix

### Phase 1: Foundation (High Impact, Low Effort)
**Timeline**: 1-2 weeks

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Enhanced prompts with validation | High | Low | P0 |
| Improved test coverage | High | Low | P0 |
| Better error messages | High | Low | P0 |
| Nx workspace API migration | Medium | Low | P1 |

**Deliverables:**
- ✅ Autocomplete for project selection
- ✅ Pre-generation validation with helpful errors
- ✅ Comprehensive generator test suite (>80% coverage)
- ✅ Migration from manual JSON to Nx APIs

---

### Phase 2: Core Features (High Impact, Medium Effort)
**Timeline**: 2-4 weeks

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Project graph integration | High | Medium | P0 |
| Generator composition | High | Medium | P1 |
| Custom executors | Medium | Medium | P1 |
| Migration system | Medium | Medium | P2 |

**Deliverables:**
- ✅ Automatic dependency detection from imports
- ✅ Multi-generator workflows (`full-domain` generator)
- ✅ `build-effect` and `test-layers` executors
- ✅ Version migration framework

---

### Phase 3: Advanced Features (Medium Impact, High Effort)
**Timeline**: 4-8 weeks

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Project graph plugin | Medium | High | P2 |
| Nx Cloud optimizations | Medium | Medium | P2 |
| Code generation from specs | Low | High | P3 |
| Visualization tools | Low | High | P3 |

**Deliverables:**
- ✅ Custom Layer dependency visualization
- ✅ Remote caching configuration templates
- ✅ OpenAPI to RPC generator
- ✅ `nx graph --show-layers` extension

---

### Phase 4: Polish & Ecosystem (Variable Impact, Ongoing)
**Timeline**: Continuous

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Documentation site | High | Medium | P1 |
| Video tutorials | Medium | Medium | P2 |
| Example repositories | Medium | Low | P1 |
| Community generators | Low | Low | P3 |

---

## Research Methodology

### 1. Documentation Review
- **Primary Sources:**
  - [Nx Official Documentation](https://nx.dev)
  - [Nx GitHub Discussions](https://github.com/nrwl/nx/discussions)
  - [Nx Plugin Examples](https://github.com/nrwl/nx-recipes)

- **Focus Areas:**
  - Generator API reference
  - Plugin development guide
  - Schema specification
  - Testing best practices

### 2. Code Analysis
- **Study Existing Plugins:**
  - `@nx/react` - Complex generator patterns
  - `@nx/node` - Executor implementations
  - `@nx/js` - TypeScript project reference management
  - Community plugins with advanced features

- **Analysis Points:**
  - Generator composition patterns
  - Schema validation strategies
  - Testing approaches
  - Error handling patterns

### 3. Prototype Development
- **Approach:**
  - Create experimental branch for each major feature
  - Build minimal prototypes to validate concepts
  - Document learnings and gotchas
  - Share prototypes for early feedback

- **Prototype Areas:**
  1. Enhanced schema with autocomplete
  2. Custom executor for Effect builds
  3. Generator composition with error handling
  4. Project graph plugin for Layer visualization

### 4. Community Engagement
- **Channels:**
  - Nx Discord community
  - Effect Discord community
  - GitHub discussions
  - Blog posts / RFCs

- **Topics:**
  - Share research findings
  - Gather feedback on proposed features
  - Learn from others' Nx plugin experiences
  - Contribute insights back to Nx documentation

---

## Success Metrics

### Generator UX
- ✅ Reduce average time to generate library by 50%
- ✅ Eliminate common user errors through validation
- ✅ Increase first-time success rate to >90%

### Code Quality
- ✅ Achieve >80% test coverage for all generators
- ✅ Zero critical bugs in generated code
- ✅ Pass all Nx plugin quality benchmarks

### Ecosystem Integration
- ✅ Full compatibility with Nx Cloud
- ✅ Seamless integration with affected commands
- ✅ Works with Nx Console extension

### Developer Experience
- ✅ Clear documentation for all features
- ✅ Example repositories demonstrating patterns
- ✅ Active community support

---

## Next Steps

### Immediate Actions (Week 1)
1. **Review Nx Documentation**
   - Read "Extending Nx" section cover-to-cover
   - Study 5 popular Nx plugins for patterns
   - Document findings in research notes

2. **Set Up Research Environment**
   - Create experimental branch: `research/nx-integration`
   - Set up test workspace for experimentation
   - Configure tooling for rapid prototyping

3. **Community Research**
   - Join Nx Discord and Effect Discord
   - Search GitHub for similar Effect + Nx integrations
   - Review Nx roadmap for upcoming features

### Week 2-3: Prototyping
1. Build enhanced prompt prototype
2. Implement generator composition POC
3. Create test suite for generators
4. Document findings and blockers

### Week 4: Planning
1. Refine priority matrix based on learnings
2. Create detailed implementation plan
3. Write RFC for major changes
4. Get community feedback

---

## Open Questions

### Technical Questions
1. **Effect + Nx Tree API**: Can we maintain Effect's functional approach while using Nx's imperative Tree API?
2. **TypeScript Project References**: How to best integrate auto-sync with generated libraries?
3. **Schema Validation**: Custom validators vs. runtime validation in generator code?
4. **Executor Performance**: What's the overhead of custom executors vs. standard TypeScript compilation?

### Architectural Questions
1. **Plugin vs. Generators**: Should this remain generator-only or become a full plugin?
2. **Breaking Changes**: How to introduce Nx-specific features without breaking CLI usage?
3. **Versioning Strategy**: Separate versions for CLI vs. Nx plugin?
4. **Workspace Scope**: Should we support non-Nx workspaces equally, or optimize primarily for Nx?

### User Experience Questions
1. **Default Behavior**: Should Nx-specific features be opt-in or opt-out?
2. **Learning Curve**: How to help users learn both Effect and Nx patterns?
3. **Migration Path**: How to migrate existing generated libraries to new patterns?
4. **Documentation**: Separate docs for CLI vs. Nx usage, or unified?

---

## Resources

### Documentation
- [Nx Extending Documentation](https://nx.dev/extending-nx/intro/getting-started)
- [Nx Plugin API Reference](https://nx.dev/extending-nx/recipes)
- [Effect Documentation](https://effect.website)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

### Tools
- [Nx Console](https://nx.dev/getting-started/editor-setup) - VSCode extension for Nx
- [Nx Cloud](https://nx.app) - Distributed task execution and caching
- [@nx/devkit](https://www.npmjs.com/package/@nx/devkit) - Nx generator utilities

### Community
- [Nx Discord](https://discord.gg/nx)
- [Effect Discord](https://discord.gg/effect)
- [Nx GitHub](https://github.com/nrwl/nx)
- [Effect GitHub](https://github.com/Effect-TS/effect)

---

## Changelog

### 2025-11-25
- Initial research plan created
- Identified 8 major research areas
- Defined 4-phase implementation approach
- Documented open questions and success metrics
