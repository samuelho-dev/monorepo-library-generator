# Publishing Checklist

Use this checklist to publish your first version.

## ☐ Pre-Publishing Setup (One-time)

### 1. Update package.json
```bash
# Edit package.json and change:
```

- [ ] `name`: `"@your-org/monorepo-library-generator"` (from `"@template/basic"`)
- [ ] `version`: `"1.0.0"` (from `"0.0.0"`)
- [ ] `description`: Add meaningful description
- [ ] `repository.url`: Add your GitHub repository URL
- [ ] `author`: Add your name and email
- [ ] `keywords`: Add relevant keywords

### 2. Set Up Repository
```bash
git init
git add .
git commit -m "Initial commit: Monorepo library generator"
git remote add origin https://github.com/your-org/monorepo-library-generator.git
git push -u origin main
```

- [ ] Repository created on GitHub
- [ ] Code pushed to GitHub
- [ ] README.md is clear and helpful

### 3. NPM Account Setup
```bash
npm login
```

- [ ] npm account created at https://www.npmjs.com
- [ ] Logged in via `npm login`
- [ ] Verify with `npm whoami`

### 4. Check Package Name Availability
```bash
npm view @your-org/monorepo-library-generator
```

- [ ] Package name is available (should return 404 or empty)
- [ ] If taken, choose a different name

## ☐ Publishing (First Release)

### 5. Build and Test
```bash
# Run full build
pnpm build

# Run all tests
pnpm test:ci

# Test generators
rm -rf libs/ packages/
npx tsx generate-test-libs.ts
```

- [ ] Build succeeds with no errors
- [ ] All tests pass
- [ ] Generated libraries compile successfully

### 6. Preview Package Contents
```bash
# See what will be published
npm pack --dry-run
```

- [ ] Check the file list
- [ ] Ensure dist/ folder is included
- [ ] Ensure src/ and test files are excluded
- [ ] Verify bin/cli.js is included

### 7. Create Changeset
```bash
npx changeset
```

- [ ] Select "major" for first release (v1.0.0)
- [ ] Add description: "Initial release of Effect-based monorepo library generator"

### 8. Version and Generate Changelog
```bash
pnpm changeset-version
```

- [ ] package.json version updated to 1.0.0
- [ ] CHANGELOG.md created/updated
- [ ] Review the changes

### 9. Commit Version Changes
```bash
git add .
git commit -m "chore: release v1.0.0"
git push
```

- [ ] Version changes committed
- [ ] Pushed to GitHub

### 10. Publish to npm
```bash
# For scoped packages (@your-org/package-name)
npm publish --access public

# OR use changeset publish (runs build + tests + publish)
pnpm changeset-publish
```

- [ ] Package published successfully
- [ ] Check at https://www.npmjs.com/package/@your-org/monorepo-library-generator

### 11. Tag Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

- [ ] Git tag created
- [ ] Tag pushed to GitHub

### 12. Create GitHub Release

- [ ] Go to GitHub → Releases → "Create a new release"
- [ ] Select tag v1.0.0
- [ ] Copy CHANGELOG.md entries
- [ ] Publish release

## ☐ Post-Publishing Verification

### 13. Test Installation
```bash
# Test CLI
npx @your-org/monorepo-library-generator --help

# Test in a fresh directory
mkdir test-install && cd test-install
npx @your-org/monorepo-library-generator contract product
```

- [ ] CLI installs and runs correctly
- [ ] Generators create files successfully
- [ ] Generated code compiles

### 14. Update Documentation

- [ ] README.md has installation instructions with correct package name
- [ ] Usage examples work
- [ ] Links are correct

## ☐ Future Updates

When publishing updates, follow this simplified checklist:

```bash
# 1. Make changes
git add .
git commit -m "feat: your feature description"

# 2. Create changeset
npx changeset
# Choose patch/minor/major based on changes

# 3. Version and publish
pnpm changeset-version
git add . && git commit -m "chore: release vX.Y.Z"
git push
pnpm changeset-publish

# 4. Tag release
git tag vX.Y.Z
git push origin vX.Y.Z
```

---

## Quick Commands Reference

```bash
# One-time setup
npm login
git init && git remote add origin <url>

# Every release
pnpm build && pnpm test:ci    # Verify
npx changeset                 # Create changeset
pnpm changeset-version        # Update version
git commit -am "chore: release vX.Y.Z"
pnpm changeset-publish        # Publish
git tag vX.Y.Z && git push --tags

# Check published package
npm view @your-org/monorepo-library-generator
```

---

## Troubleshooting

**Package name taken?**
- Try: `@your-username/monorepo-library-generator`
- Or: `effect-monorepo-generator`, `nx-effect-generator`

**Not logged in?**
```bash
npm logout && npm login
```

**Build fails?**
```bash
rm -rf build/ dist/ node_modules/
pnpm install
pnpm build
```

**Need to unpublish?** (within 72 hours)
```bash
npm unpublish @your-org/monorepo-library-generator@1.0.0
```

---

**Ready?** Start with step 1 and work through the checklist! ✅
