/**
 * Moo Module - Demonstrates using dependencies from forge home
 *
 * This module uses the 'cowsay' package installed to ~/.local/share/forge2/node_modules/
 */

import cowsay from "cowsay";

const message = cowsay.say({
  text: "Test",
  e: "oo", // Eyes
  T: "U ", // Tongue
});

console.log(message);
