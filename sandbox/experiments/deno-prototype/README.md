# Deno Runtime Prototype

**Goal:** Test if Deno can meet forge's runtime requirements

## Key Questions

1. **Module Resolution Control** - Do import maps solve the self-reference problem?
2. **Shell Scripting** - Is dax a viable replacement for Bun's built-in $?
3. **Git HTTPS Workflow** - Is token management acceptable vs SSH keys?
4. **API Compatibility** - What needs to change from Bun APIs?
5. **Performance** - Is startup/execution time acceptable?
6. **TypeScript** - Native support without compilation step?

## Test Structure

- `test-1-import-maps.ts` - Import map resolution control
- `test-2-shell.ts` - Shell scripting with dax
- `test-3-git-https.ts` - Git clone with HTTPS + tokens
- `test-4-apis.ts` - Bun API equivalents in Deno
- `deno.json` - Configuration with import maps

## Success Criteria

- ✅ Import maps prevent self-reference issue
- ✅ Shell scripting feels natural (acceptable DX)
- ✅ Git workflow is manageable (not too much overhead)
- ✅ APIs have reasonable equivalents
- ✅ Performance is comparable to Bun

## Results

### ✅ All Tests Pass - Deno is Technically Viable

1. **Import Maps** ✅ - Completely solve module resolution problem
2. **Shell Scripting** ✅ - dax provides identical DX (one import line)
3. **Git HTTPS** ⚠️ - Works but requires token management vs SSH keys
4. **API Migration** ✅ - Straightforward, 1-2 days work

### Key Decision Point

**SSH git workflow (Bun) vs Module resolution control (Deno)**

- If private git repos are frequent → Stay with Bun + fallback option
- If private git repos are rare → Deno migration worth it

See [FINDINGS.md](./FINDINGS.md) for complete analysis.
