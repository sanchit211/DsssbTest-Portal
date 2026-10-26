/**
 * Utility functions for selecting diverse random questions.
 * Ensures questions selected are not of similar type/wording,
 * balances difficulty levels, and uses unbiased Fisher-Yates shuffling.
 */

interface QuestionLike {
  id: string;
  questionText: string;
  difficulty?: string;
  correctAnswer?: string;
  [key: string]: any;
}

/**
 * Unbiased Fisher-Yates (Knuth) Shuffle
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Tokenize question text into key words, ignoring common English stop words.
 */
function getWordTokens(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "what", "which", "who", "whom",
    "this", "that", "these", "those", "am", "in", "on", "of", "for", "to", "with",
    "by", "at", "from", "as", "into", "and", "or", "not", "how", "why", "does", "do",
    "can", "could", "would", "should", "if", "then", "else", "when", "where", "find",
    "calculate", "select", "given", "following", "correct", "option", "question"
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return new Set(words);
}

/**
 * Calculate Jaccard similarity coefficient between two sets of tokens.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Pick a diverse subgroup of questions from a candidate pool.
 * Filters out questions with high text similarity (> 0.40 Jaccard similarity)
 * and distributes answer choices evenly where possible.
 */
function pickDiverseSubGroup<T extends QuestionLike>(pool: T[], targetCount: number): T[] {
  if (pool.length <= targetCount) {
    return fisherYatesShuffle(pool);
  }

  const shuffledPool = fisherYatesShuffle(pool);
  const selected: T[] = [];
  const selectedTokens: Set<string>[] = [];
  const answerCounts: Record<string, number> = {};

  const MAX_SIMILARITY_THRESHOLD = 0.40; // max allowed word overlap ratio
  const deferred: T[] = [];

  for (const candidate of shuffledPool) {
    if (selected.length >= targetCount) break;

    const candTokens = getWordTokens(candidate.questionText);
    let isTooSimilar = false;

    // 1. Text similarity check against already selected questions
    for (const selTokens of selectedTokens) {
      if (calculateJaccardSimilarity(candTokens, selTokens) > MAX_SIMILARITY_THRESHOLD) {
        isTooSimilar = true;
        break;
      }
    }

    // 2. Answer choice diversity check (avoid over-selecting same correct option code)
    const ans = candidate.correctAnswer || "";
    const currentAnsCount = answerCounts[ans] || 0;
    const maxAllowedAns = Math.max(2, Math.ceil(targetCount / 2.5));
    if (!isTooSimilar && ans && currentAnsCount >= maxAllowedAns && selected.length < targetCount - 1) {
      isTooSimilar = true;
    }

    if (!isTooSimilar) {
      selected.push(candidate);
      selectedTokens.push(candTokens);
      if (ans) answerCounts[ans] = (answerCounts[ans] || 0) + 1;
    } else {
      deferred.push(candidate);
    }
  }

  // If pool didn't have enough non-similar questions to reach targetCount, fill remaining from deferred items
  while (selected.length < targetCount && deferred.length > 0) {
    const candidate = deferred.shift()!;
    selected.push(candidate);
  }

  return fisherYatesShuffle(selected);
}

/**
 * Primary function to select diverse random questions from a bank.
 */
export function selectDiverseQuestions<T extends QuestionLike>(
  allQuestions: T[],
  count: number,
  distribution?: { easyCount?: number; mediumCount?: number; hardCount?: number }
): T[] {
  if (allQuestions.length <= count) {
    return fisherYatesShuffle(allQuestions);
  }

  // Case 1: Specific difficulty distribution requested by user
  if (distribution && (distribution.easyCount || distribution.mediumCount || distribution.hardCount)) {
    const eReq = Number(distribution.easyCount || 0);
    const mReq = Number(distribution.mediumCount || 0);
    const hReq = Number(distribution.hardCount || 0);

    const easyPool = allQuestions.filter(q => q.difficulty === "EASY");
    const medPool = allQuestions.filter(q => q.difficulty === "MEDIUM");
    const hardPool = allQuestions.filter(q => q.difficulty === "HARD");

    const selectedEasy = pickDiverseSubGroup(easyPool, eReq);
    const selectedMed = pickDiverseSubGroup(medPool, mReq);
    const selectedHard = pickDiverseSubGroup(hardPool, hReq);

    return fisherYatesShuffle([...selectedEasy, ...selectedMed, ...selectedHard]);
  }

  // Case 2: Unconstrained random selection -> Balance difficulty levels while enforcing topic diversity
  const easyPool = fisherYatesShuffle(allQuestions.filter(q => q.difficulty === "EASY"));
  const medPool = fisherYatesShuffle(allQuestions.filter(q => q.difficulty === "MEDIUM"));
  const hardPool = fisherYatesShuffle(allQuestions.filter(q => q.difficulty === "HARD"));
  const otherPool = fisherYatesShuffle(allQuestions.filter(q => !["EASY", "MEDIUM", "HARD"].includes(q.difficulty || "")));

  // Interleave questions from different difficulty pools to get an even spread
  const interleaved: T[] = [];
  const maxLen = Math.max(easyPool.length, medPool.length, hardPool.length, otherPool.length);
  for (let i = 0; i < maxLen; i++) {
    if (medPool[i]) interleaved.push(medPool[i]);
    if (easyPool[i]) interleaved.push(easyPool[i]);
    if (hardPool[i]) interleaved.push(hardPool[i]);
    if (otherPool[i]) interleaved.push(otherPool[i]);
  }

  return pickDiverseSubGroup(interleaved, count);
}
