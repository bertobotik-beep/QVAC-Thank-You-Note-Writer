# QVAC Thank You Note Writer

Enter what you're thankful for and who it's to, and an on-device AI writes a short, genuine thank-you note referencing the actual specific thing you mentioned — no invented details. No cloud call, no API key.

## How it works

1. You type the thing you're thankful for (e.g. `helping me move apartments last weekend`) and the recipient (e.g. `my brother Sam`) into the two input fields and submit.
2. The server asks the on-device model for a short, warm 2-4 sentence note addressed to that recipient, thanking them specifically for that thing, explicitly told not to invent extra details or sign off with a fabricated sender name.
3. The reply is streamed token-by-token, cleaned up, and any invented closing signature line (like "Sincerely, Alex") is deterministically stripped, since no sender name was ever provided.
4. `logic.js` checks that the note is actually grounded in the thing you mentioned (`isGrounded`); if not, or the model refused, it falls back to a guaranteed on-topic template. Either way, `ensureGreeting()` deterministically forces the note to open with `Dear <name>,` — extracting a natural first-name greeting from the recipient text (e.g. "my brother Sam" -> "Sam") — so it can never address the wrong person.

### Example

- Input: thing `helping me move apartments last weekend`, recipient `my brother Sam`
- Typical output: `"Dear Sam,\n\nThank you so much for helping me move apartments last weekend. I genuinely don't know how I would have gotten everything done without you..."`

### QVAC functions used

- `loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 })` — loads the model on-device at startup (`src/gui.js`).
- `completion({ modelId, history, stream: true, completionOpts })` — generates the note, streamed via `run.tokenStream` (`src/logic.js`).
- `unloadModel({ modelId })` — releases the model when the server shuts down (`src/gui.js`).

## Run

```bash
npm install
npm start
```

Then open http://localhost:31030

The port can be overridden with the `PORT` environment variable.

## QVAC SDK version

`@qvac/sdk` ^0.19.0 (see `package.json`).

## License

MIT
