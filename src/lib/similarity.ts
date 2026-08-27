// Code similarity / plagiarism detection engine.
// Implements several normalization strategies + a token-based similarity metric.
// Designed so an AST-based engine can be added later without changing the interface.

export interface NormalizedForm {
  tokens: string[];
  raw: string;
}

// Strip comments, strings, whitespace — keep structural tokens.
export function normalizeForComparison(code: string): NormalizedForm {
  let s = code || "";
  // remove block comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  // remove line comments
  s = s.replace(/\/\/[^\n]*/g, " ");
  s = s.replace(/#[^\n]*/g, " ");
  // remove string literals
  s = s.replace(/"(?:\\.|[^"\\])*"/g, ' "" ');
  s = s.replace(/'(?:\\.|[^'\\])*'/g, " ' ' ");
  // remove numbers
  s = s.replace(/\b\d+\b/g, " N ");
  // identifier normalization: replace identifiers with ID token, keep keywords
  const keywords = new Set([
    "def","return","if","elif","else","for","while","in","not","and","or","is","None","True","False",
    "import","from","as","class","try","except","finally","with","lambda","print","input","int","str","len","range",
    "include","iostream","using","namespace","std","int","char","void","bool","float","double","long","short","struct",
    "public","private","protected","new","delete","const","static","cin","cout","endl","vector","string","size",
    "function","var","let","const","console","log","require","module","exports","Math","Number","Array",
    "auto","break","case","switch","continue","do","default","enum","extern","goto","signed","sizeof","union","unsigned","volatile",
  ]);
  const tokens = s.match(/[A-Za-z_][A-Za-z0-9_]*|[{}\[\]()<>;:,.*+\-/%=!?&|^~@#`]/g) || [];
  const normTokens: string[] = [];
  for (const t of tokens) {
    if (keywords.has(t)) normTokens.push(t);
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) normTokens.push("ID");
    else normTokens.push(t);
  }
  return { tokens: normTokens, raw: normTokens.join(" ") };
}

// Whitespace/comment removal only (keeps identifiers)
export function normalizeWhitespaceOnly(code: string): NormalizedForm {
  let s = code || "";
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/\/\/[^\n]*/g, " ");
  s = s.replace(/#[^\n]*/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return { tokens: s.split(" "), raw: s };
}

// 3-gram Jaccard similarity over token lists
function ngrams(tokens: string[], n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) {
    set.add(tokens.slice(i, i + n).join("\u0001"));
  }
  return set;
}

export function jaccardSimilarity(a: string[], b: string[], n = 3): number {
  if (!a.length || !b.length) return 0;
  const sa = ngrams(a, n);
  const sb = ngrams(b, n);
  let inter = 0;
  for (const g of sa) if (sb.has(g)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Levenshtein on raw normalized strings (structural similarity)
export function normalizedEditDistance(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  const dp = new Uint32Array((m + 1) * (n + 1));
  const idx = (i: number, j: number) => i * (n + 1) + j;
  for (let i = 0; i <= m; i++) dp[idx(i, 0)] = i;
  for (let j = 0; j <= n; j++) dp[idx(0, j)] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[idx(i, j)] = Math.min(dp[idx(i - 1, j)] + 1, dp[idx(i, j - 1)] + 1, dp[idx(i - 1, j - 1)] + cost);
    }
  }
  const dist = dp[idx(m, n)];
  return 1 - dist / Math.max(m, n);
}

export interface SimilarityResult {
  score: number; // 0..1 overall
  method: "token_norm" | "whitespace_norm" | "identifier_norm" | "structural";
  reason: string;
  fingerprint: string;
}

// Compute a fingerprint hash for fast bucketing (hash of normalized tokens)
export function fingerprint(code: string): string {
  const { tokens } = normalizeForComparison(code);
  // hash first ~256 tokens
  const slice = tokens.slice(0, 256).join(" ");
  let h = 0;
  for (let i = 0; i < slice.length; i++) {
    h = (h * 31 + slice.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function compareCode(a: string, b: string): SimilarityResult {
  const na = normalizeForComparison(a);
  const nb = normalizeForComparison(b);
  const jaccard = jaccardSimilarity(na.tokens, nb.tokens, 3);
  const editSim = normalizedEditDistance(na.raw, nb.raw);
  const score = (jaccard * 0.6 + editSim * 0.4);
  let method: SimilarityResult["method"] = "token_norm";
  let reason: string;
  if (jaccard > 0.8) {
    method = "token_norm";
    reason = `Token-level structure is ${(jaccard * 100).toFixed(0)}% identical after normalizing identifiers, comments, and whitespace.`;
  } else if (editSim > 0.8) {
    method = "structural";
    reason = `Normalized code text is ${(editSim * 100).toFixed(0)}% similar (structural match).`;
  } else if (jaccard > 0.5) {
    method = "identifier_norm";
    reason = `Identifier-normalized tokens are ${(jaccard * 100).toFixed(0)}% similar.`;
  } else {
    method = "whitespace_norm";
    reason = `Whitespace/comment-normalized text is ${(jaccard * 100).toFixed(0)}% similar.`;
  }
  return { score, method, reason, fingerprint: fingerprint(a) };
}

export const SIMILARITY_THRESHOLD = 0.7; // above this is flagged
