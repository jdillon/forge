/*
 * Copyright 2025 Jason Dillon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Pretty stream formatter for Pino logs
 */

import process from 'node:process';
import chalk from 'chalk';
import { Writable } from 'stream';

/**
 * Custom pretty stream (synchronous, no worker threads)
 * Formats JSON log lines with optional colors
 */
export class PrettyStream extends Writable {
  constructor(private useColors: boolean = true) {
    super();
  }

  _write(chunk: any, encoding: string, callback: () => void) {
    const line = chunk.toString().trim();
    if (!line) {
      callback();
      return;
    }

    try {
      const obj = JSON.parse(line);
      const time = new Date(obj.time).toLocaleTimeString('en-US', { hour12: false });
      const level = obj.level;
      const name = obj.name;
      const msg = obj.msg;

      // Level labels
      let levelLabel = '';
      if (level >= 60) levelLabel = 'FATAL';
      else if (level >= 50) levelLabel = 'ERROR';
      else if (level >= 40) levelLabel = 'WARN';
      else if (level >= 30) levelLabel = 'INFO';
      else if (level >= 20) levelLabel = 'DEBUG';
      else levelLabel = 'TRACE';

      // Build output line with optional colors
      const c = this.useColors ? chalk : {
        gray: (s: string) => s,
        red: (s: string) => s,
        yellow: (s: string) => s,
        blue: (s: string) => s,
        cyan: (s: string) => s,
        white: (s: string) => s,
        bgRed: { white: (s: string) => s }
      };

      const levelColor = this.useColors ? (
        level >= 60 ? chalk.bgRed.white :
        level >= 50 ? chalk.red :
        level >= 40 ? chalk.yellow :
        level >= 30 ? chalk.blue :
        chalk.gray
      ) : (s: string) => s;

      const parts = [
        c.gray(time),
        levelColor(levelLabel.padEnd(5)),
        name ? c.cyan(`[${name}]`) : '',
        msg || ''
      ].filter(Boolean);

      // Add extra fields (excluding internal pino fields and err)
      const internalFields = ['time', 'level', 'msg', 'pid', 'hostname', 'err'];
      const extras = Object.keys(obj)
        .filter(key => {
          if (internalFields.includes(key)) return false;
          // Skip 'name' only if it matches the logger name (already displayed)
          if (key === 'name' && obj.name === name) return false;
          return true;
        })
        .map(key => `${c.gray(key)}=${c.white(JSON.stringify(obj[key]))}`)
        .join(' ');

      if (extras) {
        parts.push(extras);
      }

      // Write main log line
      process.stderr.write(parts.join(' ') + '\n');

      // Handle error object if present (pretty-print stack trace)
      if (obj.err && obj.err.stack) {
        const stack = obj.err.stack;
        // Split stack into lines for formatting
        const lines = stack.split('\n');

        // First line is "ErrorType: message" - make it red if colors enabled
        const firstLine = this.useColors ? c.red(lines[0]) : lines[0];
        process.stderr.write(firstLine + '\n');

        // Remaining lines are stack frames - indent and gray if colors enabled
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim()) {
            const formatted = this.useColors ? c.gray('  ' + line.trim()) : '  ' + line.trim();
            process.stderr.write(formatted + '\n');
          }
        }
      }
    } catch (err) {
      // If not JSON, just write it
      process.stderr.write(line + '\n');
    }

    callback();
  }
}
