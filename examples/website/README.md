# Forge v2 Example: Website Deployment

Demonstrates a typical website deployment workflow using Forge v2 (Bun/TypeScript).

## Project Structure

```
website/
├── .forge2/
│   └── config.ts          # Forge configuration and commands
├── dist/                  # Build output directory
└── README.md
```

## Available Commands

```bash
forge2 help        # Show commands
forge2 build       # Build website
forge2 sync        # Sync to S3
forge2 invalidate  # Invalidate CloudFront
forge2 publish     # Full publish (build + sync + invalidate)
forge2 info        # Show configuration
```

## Usage Examples

### Build and publish

```bash
cd examples/website
forge2 publish
```

### Dry-run sync

```bash
forge2 sync --dry-run
```

### Invalidate specific paths

```bash
forge2 invalidate --paths "/blog/*"
```

### Run from subdirectory (CWD-aware!)

```bash
cd examples/website/dist
forge2 publish  # Finds .forge2/ in parent directory
```

## Testing Without AWS

The commands will attempt to run AWS CLI commands. To test without AWS:

1. Mock the AWS commands (TODO: add mock mode)
2. Or set up AWS credentials and use real resources
3. Or just inspect the command definitions in `.forge2/config.ts`

## Key Features Demonstrated

1. **Bun's `$` operator** - Clean command execution
2. **Real returns** - No OUTPUT_PATTERN hack needed
3. **Command reuse** - `publish` calls `build`, `sync`, `invalidate`
4. **TypeScript types** - Config type-checked with `satisfies ForgeConfig`
5. **Argument parsing** - `--dry-run`, `--paths`, etc.
6. **CWD-aware discovery** - Run from any subdirectory
