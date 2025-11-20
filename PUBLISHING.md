# Publishing Guide

This guide covers how to publish the monorepo-library-generator package to npm.

## Prerequisites

1. **npm Account**: Create an account at https://www.npmjs.com if you don't have one
2. **npm Login**: Run `npm login` to authenticate
3. **Repository**: Set up a GitHub repository for version control

## Pre-Publishing Checklist

### 1. Update Package Metadata

Edit `package.json` and update the following fields:

```json
{
  "name": "@your-org/monorepo-library-generator",  // Change from "@template/basic"
  "version": "1.0.0",  // Change from "0.0.0"
  "description": "Effect-based monorepo library generator with Nx integration",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/monorepo-library-generator"
  },
  "author": "Your Name <your.email@example.com>",
  "keywords": [
    "effect",
    "nx",
    "generator",
    "monorepo",
    "scaffold",
    "typescript"
  ]
}
```

### 2. Add Package Scope (Optional but Recommended)

For scoped packages (e.g., `@your-org/package-name`):
- Ensures your package name doesn't conflict with existing packages
- Allows you to publish multiple related packages under your organization

For **unscoped** packages (e.g., `monorepo-library-generator`):
- Must have a globally unique name
- Check availability: `npm view monorepo-library-generator`

### 3. Set Up Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Monorepo library generator"

# Add remote and push
git remote add origin https://github.com/your-org/monorepo-library-generator.git
git branch -M main
git push -u origin main
```

### 4. Create a .npmignore File

Create `.npmignore` to exclude unnecessary files from the published package:

```
# Source files (only dist is published)
src/
libs/
packages/

# Test files
**/*.spec.ts
**/*.test.ts
test-nx-method.ts
generate-test-libs.ts
TESTING_REPORT.md

# Config files
tsconfig*.json
vitest.config*.ts
eslint.config.mjs
.eslintrc*

# CI/CD
.github/
.nx/
.changeset/

# Development
*.md
!README.md
!CHANGELOG.md
.vscode/
.idea/
```

## Publishing Methods

### Method 1: Using Changesets (Recommended)

Changesets provides automatic versioning and changelog generation.

#### Step 1: Create a Changeset

```bash
# Create a changeset describing your changes
npx changeset
```

Follow the prompts:
- Select the version bump type (major, minor, patch)
- Describe the changes

This creates a file in `.changeset/` directory.

#### Step 2: Version the Package

```bash
# Updates version and generates changelog
pnpm changeset-version
```

This will:
- Update `package.json` version
- Update `CHANGELOG.md`
- Delete the changeset file

#### Step 3: Build and Publish

```bash
# Build, test, and publish
pnpm changeset-publish
```

This runs:
1. `pnpm build` - Builds the package
2. `vitest` - Runs tests
3. `changeset publish` - Publishes to npm

### Method 2: Manual Publishing

If you prefer manual control:

#### Step 1: Update Version

```bash
# Bump version (choose one)
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

#### Step 2: Build

```bash
pnpm build
```

#### Step 3: Test Build Output

```bash
# Check what will be published
npm pack --dry-run

# Or create a tarball to inspect
npm pack
tar -xzf your-package-1.0.0.tgz
```

#### Step 4: Publish

```bash
# Publish to npm
npm publish

# For scoped packages, ensure public access
npm publish --access public
```

## Post-Publishing

### 1. Verify Publication

```bash
# Check if package is published
npm view @your-org/monorepo-library-generator

# Install in a test project
npm install @your-org/monorepo-library-generator
```

### 2. Test the Published Package

Create a test project and verify:

```bash
# Test the CLI
npx @your-org/monorepo-library-generator contract product

# Test as Nx generator (in an Nx workspace)
npm install -D @your-org/monorepo-library-generator
npx nx g @your-org/monorepo-library-generator:contract product
```

### 3. Tag the Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 4. Create GitHub Release

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Select the tag you just created
4. Copy the changelog entries
5. Publish the release

## Usage After Publishing

Users can install and use your generator in two ways:

### 1. As Standalone CLI

```bash
# Run directly with npx
npx @your-org/monorepo-library-generator contract product

# Or install globally
npm install -g @your-org/monorepo-library-generator
mlg contract product
```

### 2. As Nx Generator

In an Nx workspace:

```bash
# Install as dev dependency
npm install -D @your-org/monorepo-library-generator

# Use with nx generate
npx nx g @your-org/monorepo-library-generator:contract product
npx nx g @your-org/monorepo-library-generator:data-access product
npx nx g @your-org/monorepo-library-generator:provider stripe
```

## Publishing Updates

When you have new changes:

1. Make your changes
2. Create a changeset: `npx changeset`
3. Version: `pnpm changeset-version`
4. Publish: `pnpm changeset-publish`

## Troubleshooting

### Package Name Taken

If your package name is already taken:
- Use a scoped package: `@your-username/monorepo-library-generator`
- Choose a different name: `effect-monorepo-generator`, `nx-effect-generator`

### Publishing Fails

```bash
# Check if you're logged in
npm whoami

# Re-login if needed
npm logout
npm login

# For scoped packages, ensure public access
npm publish --access public
```

### Build Errors

```bash
# Clean and rebuild
rm -rf build/ dist/
pnpm build

# Check TypeScript errors
pnpm check
```

### Version Conflicts

```bash
# Check current version
npm view @your-org/monorepo-library-generator version

# Ensure your version is higher
npm version patch
```

## Best Practices

1. **Semantic Versioning**: Follow semver (major.minor.patch)
   - Patch: Bug fixes
   - Minor: New features (backward compatible)
   - Major: Breaking changes

2. **Test Before Publishing**: Always run tests before publishing
   ```bash
   pnpm test:ci
   ```

3. **Keep Changelog Updated**: Use changesets or manually maintain CHANGELOG.md

4. **Tag Releases**: Tag each published version in git

5. **Documentation**: Keep README.md up to date with:
   - Installation instructions
   - Usage examples
   - API documentation
   - Contributing guidelines

## CI/CD Automation (Optional)

Set up GitHub Actions to automate publishing:

Create `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    branches:
      - main

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install
      - run: pnpm build
      - run: pnpm test:ci

      - name: Publish to npm
        run: pnpm changeset-publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

Add `NPM_TOKEN` to your repository secrets:
1. Create npm token: https://www.npmjs.com/settings/~/tokens
2. Add to GitHub: Repository Settings → Secrets → New repository secret

## Support

If users encounter issues, direct them to:
- GitHub Issues: https://github.com/your-org/monorepo-library-generator/issues
- Documentation: Your repository README
- Examples: Generated test libraries in the repo

---

**Ready to publish?** Follow the checklist above and run `pnpm changeset-publish` to get started! 🚀
