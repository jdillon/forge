# ink

**React for CLIs - Build interactive command-line apps with components**

- npm: https://www.npmjs.com/package/ink
- GitHub: https://github.com/vadimdemedes/ink
- Downloads: 500K+ weekly
- Maintainer: Vadim Demedes (trusted)

---

## What is Ink?

Ink is a React renderer for building command-line interfaces. It lets you use React components, JSX, hooks, and Flexbox layouts to create interactive terminal UIs. Think "React for the terminal" - you get the component model, state management, and declarative UI paradigm, but rendered to stdout instead of the DOM.

**Key insight**: Ink is NOT just a UI library - it's a full rendering framework. It handles the entire render loop, layout calculations (via Yoga/Flexbox), and incremental updates to the terminal.

---

## Installation

```bash
bun add ink react
```

**Note**: Ink requires React as a peer dependency. Ink v4+ requires React 18+.

---

## Basic Example

```typescript
import React, {useState, useEffect} from 'react';
import {render, Text, Box} from 'ink';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box padding={1} borderStyle="round">
      <Text color="green">Count: {count}</Text>
    </Box>
  );
}

render(<Counter />);
```

---

## Core Concepts

### Rendering Model

Ink renders your React tree to the terminal:
- Initial render writes to stdout
- Updates are diffed and only changed lines are rewritten
- Uses ANSI escape codes for positioning and styling
- Respects terminal size and capabilities

### Lifecycle

```typescript
const instance = render(<App />);

// Wait for app to exit
await instance.waitUntilExit();

// Or manually unmount
instance.unmount();

// Clear output
instance.clear();

// Update props (rerender)
instance.rerender(<App newProp="value" />);
```

---

## Core Components

### Text

All text output must be wrapped in `<Text>`:

```typescript
import {Text} from 'ink';

<Text color="green">Success!</Text>
<Text bold>Bold text</Text>
<Text italic>Italic</Text>
<Text underline>Underlined</Text>
<Text dimColor>Dimmed</Text>
<Text backgroundColor="blue">With background</Text>

// Colors: chalk names, hex, or RGB
<Text color="#FF5733">Hex color</Text>
<Text color="rgb(255, 87, 51)">RGB color</Text>

// Text wrapping
<Text wrap="truncate">Long text...</Text>
<Text wrap="truncate-middle">Middle truncated...</Text>
```

### Box

Flexbox container for layouts:

```typescript
import {Box} from 'ink';

<Box flexDirection="column" padding={1} gap={2}>
  <Box borderStyle="round" borderColor="cyan">
    <Text>Header</Text>
  </Box>

  <Box flexDirection="row" gap={1}>
    <Box width="30%" padding={1}>
      <Text>Sidebar</Text>
    </Box>
    <Box flexGrow={1} padding={1}>
      <Text>Main content</Text>
    </Box>
  </Box>
</Box>
```

**Layout props**: flexDirection, flexGrow, flexShrink, flexBasis, alignItems, justifyContent, gap
**Dimensions**: width, height, minWidth, minHeight, maxWidth, maxHeight (numbers or percentages)
**Spacing**: padding, paddingX, paddingY, margin, marginX, marginY
**Borders**: borderStyle (round, single, double, etc.), borderColor
**Background**: backgroundColor

### Spacer

Pushes elements apart:

```typescript
import {Spacer} from 'ink';

<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

### Static

Renders permanent output above dynamic content:

```typescript
import {Static} from 'ink';

<>
  <Static items={completedTasks}>
    {task => (
      <Box key={task.id}>
        <Text color="green">✓ {task.name}</Text>
      </Box>
    )}
  </Static>

  <Box>
    <Text>Currently running: {currentTask}</Text>
  </Box>
</>
```

**Use case**: Build logs, completed items in a task runner, history that shouldn't scroll away.

---

## Hooks

### useInput

Capture keyboard input:

```typescript
import {useInput} from 'ink';

function App() {
  useInput((input, key) => {
    // Character input
    if (input === 'q') {
      process.exit();
    }

    // Special keys
    if (key.leftArrow) { /* ... */ }
    if (key.rightArrow) { /* ... */ }
    if (key.upArrow) { /* ... */ }
    if (key.downArrow) { /* ... */ }
    if (key.return) { /* ... */ }
    if (key.escape) { /* ... */ }

    // Modifiers
    if (key.ctrl && input === 'c') { /* ... */ }
    if (key.meta) { /* ... */ }
    if (key.shift) { /* ... */ }
  });

  return <Text>Press keys...</Text>;
}
```

### useFocus / useFocusManager

Build focusable components (like forms):

```typescript
import {useFocus, useFocusManager, useInput} from 'ink';

function Input({label, autoFocus = false}) {
  const {isFocused} = useFocus({autoFocus});
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.backspace) {
      setValue(v => v.slice(0, -1));
    } else if (input) {
      setValue(v => v + input);
    }
  });

  return (
    <Text color={isFocused ? 'cyan' : 'white'}>
      {label}: {value}
    </Text>
  );
}

function Form() {
  const {focusNext, focusPrevious} = useFocusManager();

  useInput((input, key) => {
    if (key.tab) {
      key.shift ? focusPrevious() : focusNext();
    }
  });

  return (
    <Box flexDirection="column">
      <Input label="Name" autoFocus />
      <Input label="Email" />
    </Box>
  );
}
```

### useApp

Exit the application programmatically:

```typescript
import {useApp} from 'ink';

function App() {
  const {exit} = useApp();

  useEffect(() => {
    if (done) {
      exit(); // or exit(new Error('Failed'))
    }
  }, [done]);

  return <Text>Processing...</Text>;
}
```

### useStdout / useStdin / useStderr

Access underlying streams:

```typescript
import {useStdout, useStdin} from 'ink';

function App() {
  const {stdout, write} = useStdout();
  const {stdin, setRawMode, isRawModeSupported} = useStdin();

  useEffect(() => {
    // Write outside Ink's rendering (like console.log but cleaner)
    write('Starting...\n');
  }, []);

  return <Text>App content</Text>;
}
```

---

## Advanced Features

### Transform

Modify text output before rendering:

```typescript
import {Transform, Text} from 'ink';

<Transform transform={output => output.toUpperCase()}>
  <Text>this will be uppercase</Text>
</Transform>

// Hanging indent
<Transform
  transform={(line, index) =>
    index === 0 ? line : '    ' + line
  }
>
  <Text>{longText}</Text>
</Transform>
```

### measureElement

Get computed dimensions:

```typescript
import {measureElement} from 'ink';

function App() {
  const ref = useRef();
  const [size, setSize] = useState({width: 0, height: 0});

  useEffect(() => {
    if (ref.current) {
      const {width, height} = measureElement(ref.current);
      setSize({width, height});
    }
  }, []);

  return <Box ref={ref}>...</Box>;
}
```

### Screen Reader Support

Ink supports ARIA attributes for accessibility:

```typescript
<Box aria-role="button" aria-label="Submit">
  <Text>Submit</Text>
</Box>

<Box aria-role="checkbox" aria-state={{checked: true}}>
  <Text>☑ Enabled</Text>
</Box>

// Check if screen reader is enabled
import {useIsScreenReaderEnabled} from 'ink';

function App() {
  const isScreenReader = useIsScreenReaderEnabled();

  return isScreenReader
    ? <Text>Accessible description</Text>
    : <Text>Visual representation</Text>;
}
```

---

## Testing

Ink has a dedicated testing library:

```bash
bun add -d ink-testing-library
```

```typescript
import {render} from 'ink-testing-library';
import {Text} from 'ink';

const Test = () => <Text>Hello World</Text>;
const {lastFrame, frames} = render(<Test />);

expect(lastFrame()).toBe('Hello World');
```

---

## Ecosystem

Popular Ink components:

- **ink-text-input**: Text input component
- **ink-select-input**: Select/menu component
- **ink-spinner**: Loading spinners
- **ink-table**: Table component
- **ink-big-text**: ASCII art text
- **ink-markdown**: Render markdown
- **ink-gradient**: Gradient text effects

---

## Performance Considerations

- **Rendering cost**: Ink re-renders on every state change. Use React optimization patterns (useMemo, useCallback, React.memo)
- **Terminal overhead**: Writing to stdout has overhead. High-frequency updates (60+ FPS) may cause flicker
- **maxFps option**: `render(<App />, {maxFps: 30})` to throttle updates
- **Static component**: Use for output that shouldn't change to reduce re-renders

---

## When to Use Ink

### Good fit:
- Interactive CLI tools (TUIs)
- Real-time dashboards and monitors
- Progress displays with complex layouts
- Forms and wizards
- Development tools with live updates

### Not ideal for:
- Simple CLIs with linear output (overkill - use console.log)
- High-performance logging (overhead)
- Scripts that need to integrate with pipes/streams
- When you need precise control over terminal escape codes

---

## Ink vs Existing Forge Tools

### Current Forge stack:
- **chalk**: Colors and styling
- **ora**: Spinners
- **boxen**: Boxes around text
- **listr2**: Task lists with progress
- **commander**: CLI parsing

### What Ink would replace:
- ora (spinners) → Ink components
- boxen (boxes) → Box component with borders
- Potentially listr2 → Custom Ink task list

### What Ink wouldn't replace:
- chalk (still useful for simple coloring)
- commander (CLI parsing is orthogonal)
- pino (logging is different concern)

---

## Integration Patterns

### Hybrid approach: Commander + Ink

```typescript
import {Command} from 'commander';
import {render} from 'ink';
import React from 'react';

const program = new Command();

program
  .command('deploy')
  .action(async (options) => {
    const App = () => <DeployUI options={options} />;
    const instance = render(<App />);
    await instance.waitUntilExit();
  });
```

### Forge-specific pattern

```typescript
export const myCommand: ForgeCommand = {
  description: 'Interactive deployment',
  execute: async (options, args, context) => {
    // Use Ink for interactive parts
    const instance = render(<DeployWizard context={context} />);
    const result = await instance.waitUntilExit();

    // Continue with non-interactive work
    context.log.info('Deployment complete');
  }
};
```

---

## Create New Ink Project

```bash
npx create-ink-app my-cli
npx create-ink-app --typescript my-cli
```

---

## References

- Documentation: https://github.com/vadimdemedes/ink#readme
- Component API: https://github.com/vadimdemedes/ink#components
- Hooks API: https://github.com/vadimdemedes/ink#hooks
- Examples: https://github.com/vadimdemedes/ink/tree/master/examples
