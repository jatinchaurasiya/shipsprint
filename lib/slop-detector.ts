/**
 * SlopMonster Copy Quality & AI Tell Detector
 * 
 * Direct TypeScript port of SlopMonster's deslop ruleset.
 * Strips HTML, detects AI vocabulary inflections, machine constructions,
 * tricolon cadences, and returns a quality score from 0 to 5.
 */

const VOCAB = [
  "delve", "leverage", "seamless", "elevate", "robust", "unlock", "unleash",
  "empower", "streamline", "cutting-edge", "state-of-the-art", "game-changer",
  "game-changing", "revolutionize", "revolutionise", "transformative",
  "transformation", "innovate", "holistic", "synergy", "synergies", "paradigm", "bespoke",
  "meticulous", "tapestry", "testament", "beacon", "unparalleled", "supercharge",
  "turbocharge", "effortless", "next-level",
  // second tier:
  "pivotal", "foster", "showcase", "compelling", "intuitive", "world-class",
  "best-in-class",
];

const VOCAB_EXACT = [
  "crafted", "curated", "harnessing", "harness the power", "journey", "realm", "landscape",
  "navigate the", "in the world of", "in today's", "ever-evolving", "fast-paced",
  "look no further", "dive in", "let's dive", "deep dive", "embark",
  "unlock the power", "buckle up", "the secret sauce", "level up",
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRootPattern(word: string): RegExp {
  const root = word.replace(/(ed|ing|ly|e)$/, "");
  if (root.length < 4) {
    return new RegExp(`(?<!\\w)${escapeRegex(word)}(?!\\w)`, "gi");
  }
  return new RegExp(
    `(?<!\\w)${escapeRegex(root)}(?:e|es|ed|ing|ion|ions|ional|ive|al|ally|s|ly|ness)?(?!\\w)`,
    "gi"
  );
}

const NEG_JUST = "(?:\\bnot|n['’]t)\\s+(?:just|only|merely|simply)\\b";
const XY_TAIL = "[^!?]{0,80}?[,.]\\s*(?:it|this|that|they|we|you|he|she|i)\\b";

const PHRASES: Array<[RegExp, string]> = [
  [new RegExp(`${NEG_JUST}[^.!?]{0,80}\\bbut\\b`, "gi"), "the 'not just X, but Y' construction"],
  [new RegExp(`${NEG_JUST}${XY_TAIL}`, "gi"), "the 'not just X, it's Y' construction"],
  [/\bwhether you(?:'?re| are)\b[^.!?]{0,40}\bor\b/gi, "the 'whether you're X or Y' opener"],
  [/\bmore than just\b/gi, "'more than just'"],
  [/\b(?:that|this)(?:'?s| is) where\b[^.!?]{0,30}\bcomes? in\b/gi, "'that's where X comes in'"],
  [/\bsay goodbye to\b/gi, "'say goodbye to'"],
  [/\bimagine (?:a|an|the)\b/gi, "the 'imagine a…' opener"],
  [/\bin conclusion\b|\bto sum up\b/gi, "essay-summary phrasing"],
  [/\bwhen it comes to\b/gi, "'when it comes to' filler"],
  [/\bat the end of the day\b/gi, "'at the end of the day'"],
  [/\bthe key is\b|\bthe truth is\b/gi, "throat-clearing opener"],
  [/\bhelps? you to\b|\bcan help you\b/gi, "hedged benefit ('helps you to…')"],
  [/\bmay potentially\b|\bcould potentially\b|\bmight possibly\b/gi, "stacked hedging"],
  [/\bvery unique\b|\bquite literally\b/gi, "intensifier padding"],
  [/\bhere'?s the thing\b|\blet'?s break (?:it|this) down\b|\bthe best part\b/gi, "throat-clearing opener"],
  [/\bready to get started\b|\blet'?s get started\b/gi, "boilerplate CTA"],
  [/\bthe (?:result|answer|catch|kicker|upshot)\?\s/gi, "self-answering question"],
];

const COMPOUND = /\b[a-z]{2,}-[a-z]{2,}(?:-[a-z]{2,})*\b/gi;
const COMPOUND_FLOOR = 4;

const PROOF = new RegExp(
  "([\\d][\\d,]*(?:\\.\\d+)?)\\s*\\+?\\s*" +
  "((?:happy|early|active|satisfied|verified|trusted|delighted)\\s+)?" +
  "(?:\\w+\\s+){0,1}" +
  "(users?|customers?|learners?|students?|teams?|members?|companies|businesses" +
  "|homeowners?|subscribers?|clients?|patients?|readers?|sites?|projects?)" +
  "(?!\\w)",
  "gi"
);

export function normaliseCopy(text: string): string {
  return text
    .replace(/‑/g, "-")
    .replace(/\xa0/g, " ")
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtmlToVisibleText(html: string): string {
  let t = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  // Basic HTML entity decoding
  t = t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return normaliseCopy(t);
}

export interface SlopAuditHits {
  vocab: Array<[string, number]>;
  phrases: Array<[string, number]>;
  punctuation: Array<[string, string]>;
  rhythm: Array<[string, string]>;
  proof: string[];
}

export interface SlopAuditResult {
  score: number;
  isClean: boolean;
  wordCount: number;
  hits: SlopAuditHits;
}

export function auditCopy(text: string, options?: { allowProof?: boolean }): SlopAuditResult {
  const norm = normaliseCopy(text);
  const low = norm.toLowerCase();
  const hits: SlopAuditHits = {
    vocab: [],
    phrases: [],
    punctuation: [],
    rhythm: [],
    proof: [],
  };

  // 1. Vocabulary (stemmed roots)
  for (const w of VOCAB) {
    const pat = getRootPattern(w);
    const matches = low.match(pat);
    if (matches && matches.length > 0) {
      hits.vocab.push([w, matches.length]);
    }
  }

  // 2. Vocabulary (exact words)
  for (const w of VOCAB_EXACT) {
    const pat = new RegExp(`(?<!\\w)${escapeRegex(w)}(?!\\w)`, "gi");
    const matches = low.match(pat);
    if (matches && matches.length > 0) {
      hits.vocab.push([w, matches.length]);
    }
  }

  // 3. Phrases and tell constructions
  for (const [pat, label] of PHRASES) {
    const matches = low.match(pat);
    if (matches && matches.length > 0) {
      hits.phrases.push([label, matches.length]);
    }
  }

  // 4. Punctuation cadence
  const sentences = norm.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    for (let i = 0; i < Math.max(1, s.length); i += 220) {
      const window = s.slice(i, i + 220);
      const emDashes = (window.match(/—/g) || []).length;
      if (emDashes >= 2) {
        hits.punctuation.push(["two or more em-dashes in one sentence", window.slice(0, 70).trim()]);
        break;
      }
    }
    for (let i = 0; i < Math.max(1, s.length); i += 220) {
      const window = s.slice(i, i + 220);
      const compounds = window.match(COMPOUND) || [];
      if (compounds.length >= COMPOUND_FLOOR) {
        hits.punctuation.push([
          `${compounds.length} hyphenated compounds stacked in one sentence`,
          compounds.slice(0, 4).join(", "),
        ]);
        break;
      }
    }
  }

  const semicolonCount = (norm.match(/;/g) || []).length;
  if (semicolonCount > Math.max(3, Math.floor(norm.length / 1200))) {
    hits.punctuation.push(["semicolon-heavy for web copy", `${semicolonCount} found`]);
  }

  // 5. Tricolon (Rule-of-three list)
  const tricolonPats = [
    /\b(\w{4,}),\s+(\w{4,}),\s+and\s+(\w{4,})\b/gi,
    /\b(\w{4,}),\s+(\w{4,})\s+and\s+((?:\w+\s+){1,2}\w+)\s*[.!?,;:]/gi,
  ];
  for (const pat of tricolonPats) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(norm)) !== null) {
      hits.rhythm.push(["rule-of-three list", m[0].slice(0, 60)]);
    }
  }

  // 6. Invented Proof
  let proofMatch: RegExpExecArray | null;
  while ((proofMatch = PROOF.exec(norm)) !== null) {
    hits.proof.push(proofMatch[0].trim());
  }

  const weights = {
    vocab: 1,
    phrases: 1,
    punctuation: 1,
    rhythm: 1,
    proof: options?.allowProof ? 0 : 1,
  };

  const failedCategories = (Object.keys(hits) as Array<keyof SlopAuditHits>).filter(
    (k) => hits[k].length > 0
  );

  const deductions = failedCategories.reduce((sum, k) => sum + (weights[k] || 0), 0);
  const score = Math.max(0, 5 - deductions);
  const words = norm.split(/\s+/).filter(Boolean);

  return {
    score,
    isClean: score === 5,
    wordCount: words.length,
    hits,
  };
}
