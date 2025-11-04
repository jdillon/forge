// Test with scoped package that doesn't exist
// This should trigger onResolve with the package name
try {
  const { log } = await import('@planet57/forge/lib/logging');
  log.info('This should not run');
} catch (error) {
  console.log('Import failed as expected:', error.message);
}

console.log('Test complete');
