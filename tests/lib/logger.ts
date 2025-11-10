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
 * Logger for test infrastructure - independent of app's initLogging system
 * For use in test fixtures and test helpers
 */

import pino from 'pino';
import pretty from 'pino-pretty';

const root = pino(
  {
    // Silent by default, debug when VERBOSE=1 (matches println behavior)
    level: process.env.VERBOSE ? 'debug' : 'silent',
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  pretty({
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'hostname,pid',
    sync: true, // Required for test environments
  })
);

/**
 * Create a logger for tests.
 */
export const createLogger = (name: string): pino.Logger => {
  return root.child({
      name: name
    });
};
