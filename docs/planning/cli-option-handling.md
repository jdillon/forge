# CLI Option Handling Specification

This document specifies how Forge v2 CLI option and argument parsing should work.

## Goals

- Validate this specification works with Commander.js
- Identify any limitations we need to accept or find alternative frameworks

## Reference CLI Structure

Throughout this specification, we use this example CLI structure:

**Main Program:**
```
Usage: example [options] [command]

Options:
  -d, --debug            Debug output
  -h, --help             Display help
  --log-level <level>    Set log level
  --no-color             Disable colored output
  -V, --version          Output the version number

Commands:
  basic                  Basic example commands
  help [command]         Display help for command
```

**Subcommand:**
```
Usage: example greet [options] [name]

Greet someone

Arguments:
  name        Name to greet (uses config default if not provided)

Options:
  -h, --help  display help
  -l, --loud  Use uppercase
```

## Option Positioning Rules

### Top-Level Options

**Top-level options MUST appear before the subcommand name.**

The first non-option argument determines the boundary between main program options and subcommand arguments.

Valid:
```bash
example --debug greet
example --debug --log-level info greet Alice
```

Invalid:
```bash
example greet --debug        # --debug unknown to greet subcommand
```

### Subcommand Options

**Subcommand options can appear in any position after the subcommand name.**

Valid:
```bash
example greet --loud
example greet --loud Alice
example greet Alice --loud
example --debug greet Alice --loud
```

Invalid:
```bash
example greet --foo          # --foo is not a valid greet option
```

## Invalid Option Handling

### Invalid Top-Level Options

Unknown options appearing before the subcommand name are invalid and should produce an error:

```bash
example --foo                # ERROR: unknown option '--foo'
example --foo greet          # ERROR: unknown option '--foo'
```

### Invalid Subcommand Options

Unknown options appearing after the subcommand name are invalid and should produce an error:

```bash
example greet --foo          # ERROR: unknown option '--foo'
```

## Help Behavior

Help should be displayed and program exits with code 0 when:
- User explicitly requests help with `--help` or `-h`
- User requests help for a specific subcommand

Help should be displayed and program exits with code 1 when:
- No subcommands given and there is no default command

### Main Program Help

Show main program help when:
```bash
example --help               # Explicit help request
example --help greet         # --help before subcommand = main help
example                      # No subcommand provided (exit code 1)
```

### Subcommand Help

Show subcommand-specific help when:
```bash
example greet --help         # --help after subcommand = subcommand help
```

## Version Behavior

Version should be displayed and program exits with code 0 when:
```bash
example --version
example -V
```

## Argument Syntax

### Optional Arguments

Use `[arg]` syntax for optional arguments. Arguments are optional from the user's perspective if they don't have to provide them, even if the command has a default value from configuration.

```bash
Usage: example greet [name]

example greet                # Valid - uses default from config
example greet Alice          # Valid - overrides default
```

### Required Arguments

Use `<arg>` syntax for required arguments. If not provided, show error with exit code 1.

```bash
Usage: example deploy <environment>

example deploy               # ERROR: missing required argument 'environment'
example deploy production    # Valid
```

## Exit Codes

### Success (0)
- Explicit help request: `--help`, `-h`
- Explicit version request: `--version`, `-V`
- Command executed successfully

### User Input Error (1)
- Invalid option provided
- Missing required argument
- Invalid argument value
- No subcommand provided (shows help)

### Internal Error (2)
- Exceptions during command execution
- Internal implementation failures
- Unexpected errors ("our fault")

### Exception to Exit Codes
If `--help` or `--version` processing causes an internal exception, should exit with code 2 (internal error), not 0.

## Error Presentation

**Default: Terse error messages**

```bash
example --foo
ERROR: unknown option '--foo'
Try 'example --help' for more information.
```

**With --debug: Verbose error details**

Show additional context, stack traces, or debugging information when `--debug` flag is present.

**Note for implementation:** Consider adding a stack trace flag (like `mvn -e`) to show error stack traces without requiring full `--debug` mode.

## Option Arguments (Commander.js Defaults)

For options that take arguments, defer to Commander.js default behavior:
- `--option=value` syntax
- `--option value` syntax
- Optional option arguments: `--option [value]`
- Multiple arguments: `--coords <x> <y>`

**TODO:** Create comprehensive tests for each Commander.js option argument pattern to verify behavior matches expectations.

## Implementation Notes

### Parsing Architecture

**Multiple parsing instances is acceptable.** Using different instances of the parsing framework (e.g., separate Commander instances) for bootstrap vs. primary execution is fine. For example:
- Bootstrap instance: Extract early options (--debug, --log-level) before loading modules
- Primary instance: Full CLI with subcommands for actual execution

**Avoid custom process.argv manipulation.** Do not implement custom process.argv parsing/hackery unless absolutely necessary. If custom parsing seems required:
1. Stop and confirm with project owner first
2. We may have missed a spec use-case
3. May need to revisit specification or implementation approach
4. If approved, document the custom logic extensively

**Minor workarounds are acceptable.** Some pragmatic workarounds are fine if they keep the implementation clean:
- Parsing twice (bootstrap + execution)
- Using framework features in non-standard ways
- Small validation logic between parsing phases

**When workarounds become significant:** If implementation requires substantial custom logic beyond the framework, STOP. This signals either:
- The specification needs revision
- The framework choice needs reconsideration
- We're solving the problem incorrectly

### Boundary Detection

The main program will not take any positional arguments that are not subcommand names. The first non-option (non-flag) argument determines the boundary between program options and subcommand command-line arguments.

### Subcommand Flexibility

Subcommands may have:
- Arguments only
- Options only
- Both arguments and options
- Neither (simple commands)
