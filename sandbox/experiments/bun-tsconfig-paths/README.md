# Bun tsconfig.json Paths Test

Testing if Bun's tsconfig.json paths support can solve our module resolution problem.

## Goal

Use tsconfig.json paths to map package imports to git clone cache locations.

## Test

1. Create fake "installed" package in cache directory
2. Configure tsconfig.json to map `@planet57/forge/*` to cache
3. Test if imports resolve correctly
4. Verify singleton preservation
