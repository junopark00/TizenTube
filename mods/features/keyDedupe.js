// Drops duplicated remote key presses.
//
// Some Tizen TVs/remotes occasionally deliver the same arrow/OK keydown twice
// within a few milliseconds (or repeat it without the `repeat` flag), which
// makes the focus jump two items at once. YouTube itself ignores keydown
// events flagged as repeats, but not these duplicates. Real long presses
// (key held longer than HOLD_MS) are kept so holding a direction key still
// scrolls continuously.
//
// This must be registered on window in the capture phase before YouTube's own
// listeners, which is why it runs at import time.

import { configRead } from '../config.js';

const DUPLICATE_WINDOW_MS = 80;
const HOLD_MS = 400;
const WATCHED_KEYS = { 13: 'OK', 37: 'left', 38: 'up', 39: 'right', 40: 'down' };
const state = {};

function onKeyDown(evt) {
    if (!(evt.keyCode in WATCHED_KEYS)) return;
    if (!configRead('enableKeyDedupe')) return;

    const now = Date.now();
    const keyState = state[evt.keyCode] || (state[evt.keyCode] = { firstDownAt: 0, lastDownAt: 0, held: false });
    let duplicate;

    if (keyState.held) {
        // No keyup since the previous keydown: either an auto-repeat (fine once
        // the key has really been held for a while) or a duplicated event.
        duplicate = now - keyState.firstDownAt < HOLD_MS;
    } else {
        duplicate = now - keyState.lastDownAt < DUPLICATE_WINDOW_MS;
        if (!duplicate) keyState.firstDownAt = now;
    }

    keyState.lastDownAt = now;
    keyState.held = true;

    if (duplicate) {
        console.info('Dropping duplicated key press:', WATCHED_KEYS[evt.keyCode], now - keyState.firstDownAt, 'ms');
        evt.stopImmediatePropagation();
        evt.preventDefault();
    }
}

function onKeyUp(evt) {
    const keyState = state[evt.keyCode];
    if (keyState) keyState.held = false;
}

window.addEventListener('keydown', onKeyDown, true);
window.addEventListener('keyup', onKeyUp, true);
