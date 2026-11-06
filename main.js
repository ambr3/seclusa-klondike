/*
 * Seclusa Games — klondike entry point.
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step, run directly by the browser).
 *
 * The engine lives in the shared `cards` folder because Pyramid uses it too; only the
 * game class and the asset base are specific to klondike. This file is separate from
 * index.html purely because the Content-Security-Policy forbids inline scripts.
 */

import { Klondike } from './Klondike.js';
import { boot } from './cards/engine/boot.js';

boot(Klondike, 'cards/', 'Klondike');
