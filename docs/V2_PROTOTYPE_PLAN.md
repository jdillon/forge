# V2 Prototype Plan: Pure Bun Implementation

**Goal**: Minimal working prototype to evaluate Bun-based forge framework

**Date**: 2025-10-29

---

## Prototype Structure

```
forge-bash/  (this repo)
├── forge                   # Original Bash version
├── forge2                  # New Bun prototype (TypeScript)
├── lib/
│   ├── core.ts            # Framework core
│   └── aws.ts             # AWS module example
├── examples/
│   └── website/           # Example project
│       ├── .forge2/
│       │   └── config.ts  # Project config
│       └── README.md
└── docs/
    └── V2_PROTOTYPE_PLAN.md
```

---

## Design Decisions

### 1. Entry Point: `forge2` (TypeScript)

```typescript
#!/usr/bin/env bun
import { forge } from './lib/core';

// Discover project root (walk up from CWD)
const projectRoot = await forge.discoverProject();

// Load project config
const config = await import(`${projectRoot}/.forge2/config.ts`);

// Execute command
await forge.run(config);
```

### 2. Core Framework: `lib/core.ts`

**Key features:**
- CWD-aware project discovery (walk up like git)
- Command registration and dispatch
- Module loading
- State management (JSON)
- Bun's `$` operator for commands

```typescript
export interface ForgeCommand {
  description: string;
  usage?: string;
  execute: (args: string[]) => Promise<void>;
}

export interface ForgeConfig {
  modules?: string[];
  commands: Record<string, ForgeCommand>;
  defaultCommand?: string;
}

export const forge = {
  async discoverProject(): Promise<string | null>,
  async loadModule(name: string): Promise<void>,
  async run(config: ForgeConfig): Promise<void>,
};
```

### 3. Project Config: `.forge2/config.ts`

```typescript
import { ForgeConfig } from '@forge/core';
import { awsCommands } from '@forge/aws';

export default {
  modules: ['aws'],

  commands: {
    // Inline command definition
    'website-sync': {
      description: 'Sync website to S3',
      usage: 'website-sync [--dry-run]',
      execute: async (args) => {
        const dryRun = args.includes('--dry-run');
        const bucket = 'my-website-bucket';

        console.log(`Syncing to s3://${bucket}/...`);

        if (dryRun) {
          await $`aws s3 sync dist/ s3://${bucket}/ --dryrun`;
        } else {
          await $`aws s3 sync dist/ s3://${bucket}/ --delete`;
        }

        console.log('✓ Sync complete');
      }
    },

    'website-invalidate': {
      description: 'Invalidate CloudFront cache',
      execute: async (args) => {
        const distId = 'E1234567890ABC';

        console.log(`Invalidating CloudFront distribution ${distId}...`);

        const result = await $`aws cloudfront create-invalidation \
          --distribution-id ${distId} \
          --paths "/*"`.text();

        console.log('✓ Invalidation created');
        console.log(result);
      }
    },

    'website-publish': {
      description: 'Sync and invalidate (full publish)',
      execute: async (args) => {
        // Reuse other commands
        await config.commands['website-sync'].execute(args);
        await config.commands['website-invalidate'].execute(args);

        console.log('✓ Website published');
      }
    },

    // Or import from module
    ...awsCommands,
  }
} satisfies ForgeConfig;
```

---

## Evaluation Criteria

After building prototype, evaluate:

### ✅ Love It If:
1. Adding commands feels natural
2. Bun's `$` operator is pleasant to use
3. TypeScript types catch real errors
4. Startup is fast enough (<100ms)
5. CWD-aware discovery works smoothly
6. Module loading is simple

### ❌ Hate It If:
1. Too much TypeScript boilerplate
2. `$` operator is awkward
3. Import/export too complex vs Bash `source`
4. Slower than expected
5. Bun installation is painful

### 🤔 Unsure If:
1. Missing the simplicity of Bash
2. Type safety feels like overkill
3. Worried about Bun maturity/ecosystem

---

## Implementation Steps

1. ✅ Create Bun installation strategy (BUN_INSTALL)
2. ✅ Design prototype structure
3. ⏳ Implement `lib/core.ts`
4. ⏳ Implement `forge2` entry point
5. ⏳ Create example website commands
6. ⏳ Test workflow: `forge2 website-publish`
7. ⏳ Document findings

---

## Key Features to Demonstrate

### 1. CWD-Aware Discovery
```bash
cd ~/projects/website/src/components
forge2 website-sync  # Finds .forge2/ in ~/projects/website/
```

### 2. Module Loading
```typescript
// In config.ts
import { awsCommands } from '@forge/aws';

export default {
  modules: ['aws'],  // Auto-loaded from ~/.forge2/modules/
  commands: { ...awsCommands }
}
```

### 3. Command Execution
```typescript
// Bun's $ operator - almost as easy as Bash!
await $`aws s3 sync . s3://${bucket}/`;
const distId = await $`aws cloudfront list-distributions ...`.text();
```

### 4. State Management
```typescript
import { state } from '@forge/core';

// Project state (git-tracked)
await state.project.set('environment', 'staging');
const env = await state.project.get('environment');

// User state (gitignored)
await state.user.set('aws_profile', 'my-profile');
```

### 5. Real Returns (No OUTPUT_PATTERN hack!)
```typescript
async function getDistributionId(): Promise<string> {
  console.log('Fetching distribution ID...');  // stdout is free!

  const result = await $`aws cloudfront list-distributions \
    --query "..." --output text`.text();

  return result.trim();  // Real return! 🎉
}

const distId = await getDistributionId();
```

---

## Bun Installation Strategy

### Auto-Install on First Run

```typescript
// In forge2 bootstrap
const bunPath = path.join(os.homedir(), '.forge2', 'bin', 'bun');

if (!fs.existsSync(bunPath)) {
  console.log('Bun not found. Installing to ~/.forge2/...');

  const install = Bun.spawn([
    'bash', '-c',
    'export BUN_INSTALL="$HOME/.forge2" && curl -fsSL https://bun.sh/install | bash'
  ]);

  await install.exited;
  console.log('✓ Bun installed');
}
```

### Version Management

```typescript
// In .forge2/config.ts
export default {
  bunVersion: 'bun-v1.1.34',  // or 'latest'
  // ...
}

// Framework checks and upgrades if needed
if (config.bunVersion !== currentVersion) {
  await $`bun upgrade`;  // or install specific version
}
```

---

## Comparison to Bash Version

| Feature | Bash | Bun | Winner |
|---------|------|-----|--------|
| Command execution | `aws s3 ls` | `await $\`aws s3 ls\`` | Bash (slightly) |
| Function returns | OUTPUT_PATTERN hack | Native `return` | **Bun** |
| Type safety | None | TypeScript | **Bun** |
| Startup time | ~50ms | ~60ms | Bash (slightly) |
| Installation | Built-in | Must install | Bash |
| Ecosystem | Shell utils | npm packages | **Bun** |
| Learning curve | Shell scripting | TypeScript | Tie |
| Error handling | Verbose | try/catch | **Bun** |

---

## Next Steps After Evaluation

### If Love It ✅
- Continue with pure Bun approach
- Add more features (completion, help, etc.)
- Polish installation experience
- Add module repository

### If Hate It ❌
- Try Bash 5 + nameref approach instead
- Keep framework in Bash
- Revisit hybrid approach

### If Unsure 🤔
- Build Bash 5 prototype in parallel
- Compare side-by-side
- Try hybrid (Bash framework + Bun helpers)

---

## Installation & Usage Test

```bash
# Clone forge2
git clone https://github.com/jdillon/forge2 ~/.forge2

# Add to PATH (or create ~/bin/forge2 symlink)
export PATH="$HOME/.forge2/bin:$PATH"

# Try it!
cd ~/projects/website
forge2 website-publish
```

Should work from any subdirectory! 🎯
