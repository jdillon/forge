/**
 * Moo Module - Demonstrates using dependencies from forge home
 *
 * This module uses the 'cowsay' package installed to ~/.local/share/forge2/node_modules/
 */

import cowsay from 'cowsay';
import type { ForgeCommand } from '@planet57/forge/types';

/**
 * Make a cow say something
 */
export const say: ForgeCommand = {
  description: 'Make a cow say something',
  usage: '<text...>',

  execute: async (options, args, context) => {
    const text = args.join(' ');

    if (!text) {
      console.error('ERROR: Please provide text for the cow to say');
      console.error('Usage: forge moo say <text...>');
      process.exit(1);
    }

    const message = cowsay.say({
      text,
      e: 'oo',  // Eyes
      T: 'U ',  // Tongue
    });

    console.log(message);
  },
};

/**
 * Make a cow think something
 */
export const think: ForgeCommand = {
  description: 'Make a cow think something',
  usage: '<text...>',

  execute: async (options, args, context) => {
    const text = args.join(' ');

    if (!text) {
      console.error('ERROR: Please provide text for the cow to think');
      console.error('Usage: forge moo think <text...>');
      process.exit(1);
    }

    const message = cowsay.think({
      text,
      e: 'oo',
    });

    console.log(message);
  },
};
