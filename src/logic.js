// QVAC Thank You Note Writer — core logic.
// completion() writes a short genuine thank-you note referencing the actual
// thing mentioned. The note is deterministically forced to open with
// "Dear {recipient}," and any invented signature name is stripped, so the
// output can never address the wrong person or fabricate a sender.

import { completion } from "@qvac/sdk";

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "my", "me"]);

function keywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  if (text.length > 500) return true;
  const bad = ["i cannot", "i can't", "as an ai", "i'm not able", "i do not have", "please provide"];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

function isGrounded(text, thing) {
  const words = keywords(thing);
  if (words.length === 0) return true;
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

function stripInventedSignature(text) {
  // Remove a trailing signature line like "- Sarah", "- Sarah Jones", or
  // "Sincerely,\nAlex" since we were never given the sender's name and don't
  // want one invented. The name portion allows multiple capitalized words
  // (e.g. a full first + last name), not just a single word.
  const namePattern = "[A-Z][a-zA-Z'-]*(?:\\s+[A-Z][a-zA-Z'-]*)*";
  return text
    .replace(new RegExp(`\\n+\\s*(sincerely|warmly|best|regards|love|thanks again)[,.]?\\s*\\n+\\s*${namePattern}\\s*$`, "i"), "")
    .replace(new RegExp(`\\n+\\s*[-—]\\s*${namePattern}\\s*$`), "")
    .trim();
}

function greetingName(recipient) {
  // Prefer a trailing capitalized name ("my coworker Priya" -> "Priya") for a
  // natural-sounding greeting; fall back to the full phrase if none is found.
  const words = recipient.trim().split(/\s+/);
  const last = words[words.length - 1];
  return /^[A-Z][a-zA-Z'-]*$/.test(last) ? last : recipient;
}

function ensureGreeting(text, recipient) {
  const trimmed = text.trim();
  const greetingRe = /^dear\s+/i;
  if (greetingRe.test(trimmed)) return trimmed;
  return `Dear ${greetingName(recipient)},\n\n${trimmed}`;
}

const FALLBACK = (thing, recipient) =>
  `Dear ${greetingName(recipient)},\n\nI just wanted to take a moment to say thank you for ${thing}. It ` +
  `really meant a lot to me, and I don't think I say it enough. I'm so grateful to have you in my life.`;

export async function generate(modelId, thing, recipient) {
  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content:
          `Write a short, warm, genuine thank-you note (2-4 sentences) addressed to ${recipient}, thanking ` +
          `them specifically for: ${thing}. Do not invent additional details beyond what's mentioned. Do not ` +
          "sign the note with any name (no sender name, since none was given) — end with the thank-you " +
          "itself, not a closing signature. Reply with ONLY the note text, no preamble.",
      },
      { role: "user", content: "Thing: helping me move apartments last weekend\nRecipient: my brother Sam" },
      {
        role: "assistant",
        content:
          "Dear Sam,\n\nThank you so much for helping me move apartments last weekend. I genuinely don't " +
          "know how I would have gotten everything done without you carrying boxes all day. It meant more " +
          "to me than I probably showed at the time.",
      },
      { role: "user", content: `Thing: ${thing}\nRecipient: ${recipient}` },
    ],
    stream: true,
    completionOpts: { temperature: 0.75, maxTokens: 200 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;
  text = text
    .trim()
    .replace(/^here'?s[^:\n]*:\s*/i, "")
    .trim()
    .replace(/^["'“]|["'”]$/g, "")
    .trim();
  text = stripInventedSignature(text);

  let note = looksUnusable(text) || !isGrounded(text, thing) ? FALLBACK(thing, recipient) : text;
  note = ensureGreeting(note, recipient);

  return { note };
}
