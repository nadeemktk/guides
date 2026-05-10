export interface MentionResult {
  mentioned: boolean;
  position: number | null;
  contextSnippet: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitors: Array<{ name: string; position: number }>;
}

function buildVariants(name: string): string[] {
  const variants = [name];
  // possessive
  variants.push(`${name}'s`);
  // lowercase
  variants.push(name.toLowerCase());
  // without spaces (e.g. "AcmeCo")
  variants.push(name.replace(/\s+/g, ""));
  // first word only (for multi-word brands)
  const words = name.split(/\s+/);
  if (words.length > 1) variants.push(words[0]);
  return [...new Set(variants)];
}

function findMentionPosition(text: string, variants: string[]): number | null {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  let earliestWordIndex: number | null = null;

  for (const variant of variants) {
    const lv = variant.toLowerCase();
    const idx = lowerText.indexOf(lv);
    if (idx !== -1) {
      const wordIndex = words.slice(0, words.findIndex((_, i) => words.slice(0, i + 1).join(" ").length >= idx) + 1).length;
      if (earliestWordIndex === null || wordIndex < earliestWordIndex) {
        earliestWordIndex = wordIndex;
      }
    }
  }
  return earliestWordIndex;
}

function extractContextSnippet(text: string, variant: string): string | null {
  const idx = text.toLowerCase().indexOf(variant.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 100);
  const end = Math.min(text.length, idx + variant.length + 100);
  return text.slice(start, end).trim();
}

function detectSentiment(text: string, brandName: string): "positive" | "neutral" | "negative" {
  const lowerText = text.toLowerCase();
  const brandIdx = lowerText.indexOf(brandName.toLowerCase());
  if (brandIdx === -1) return "neutral";

  const window = lowerText.slice(Math.max(0, brandIdx - 200), brandIdx + 200);

  const positiveWords = ["recommend", "great", "excellent", "best", "top", "love", "fantastic", "outstanding", "perfect", "popular", "well-regarded", "highly rated", "trusted"];
  const negativeWords = ["avoid", "poor", "worst", "bad", "terrible", "disappointing", "overpriced", "not recommend", "issues", "problems"];

  const positiveCount = positiveWords.filter((w) => window.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => window.includes(w)).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

// Simple brand name extractor from LLM response text
// Finds capitalized multi-word sequences that look like brand names
function extractCompetitorBrands(
  text: string,
  ownBrandVariants: string[]
): Array<{ name: string; position: number }> {
  const brandPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  const found: Map<string, number> = new Map();

  // Common words to exclude
  const stopWords = new Set([
    "I", "The", "A", "An", "And", "Or", "But", "For", "With", "On", "In",
    "At", "To", "Of", "By", "From", "That", "This", "These", "Those",
    "Here", "There", "They", "Their", "You", "Your", "We", "Our",
    "Best", "Great", "Good", "Top", "High", "Low", "New", "Old",
    "First", "Last", "Next", "More", "Most", "Some", "Any", "All",
    "Amazon", "Google", "Apple", "ChatGPT", "AI", "LLM",
  ]);

  let match;
  let wordCount = 0;
  const words = text.split(/\s+/);
  let currentWord = 0;

  while ((match = brandPattern.exec(text)) !== null) {
    const candidate = match[1];
    if (stopWords.has(candidate)) continue;
    if (candidate.length < 3) continue;

    // Skip if it's the own brand
    const isOwnBrand = ownBrandVariants.some(
      (v) => v.toLowerCase() === candidate.toLowerCase()
    );
    if (isOwnBrand) continue;

    // Estimate position (word index in text)
    const approxPosition = text.slice(0, match.index).split(/\s+/).length;

    if (!found.has(candidate)) {
      found.set(candidate, approxPosition);
    }
    wordCount++;
    if (wordCount > 100) break; // safety limit
    currentWord = approxPosition;
  }

  void currentWord; // suppress unused warning

  return Array.from(found.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map(([name, position]) => ({ name, position }));
}

export function detectMention(
  responseText: string,
  brandName: string,
  brandAliases: string[] = []
): MentionResult {
  if (!responseText) {
    return { mentioned: false, position: null, contextSnippet: null, sentiment: null, competitors: [] };
  }

  const allVariants = buildVariants(brandName);
  for (const alias of brandAliases) {
    allVariants.push(...buildVariants(alias));
  }

  const lowerText = responseText.toLowerCase();
  let mentioned = false;
  let matchedVariant: string | null = null;

  for (const variant of allVariants) {
    if (lowerText.includes(variant.toLowerCase())) {
      mentioned = true;
      matchedVariant = variant;
      break;
    }
  }

  if (!mentioned) {
    const competitors = extractCompetitorBrands(responseText, allVariants);
    return { mentioned: false, position: null, contextSnippet: null, sentiment: null, competitors };
  }

  // Find approximate position (which brand mention number)
  const allBrandsInText = extractCompetitorBrands(responseText, []);
  const brandPositionIdx = allBrandsInText.findIndex(
    (b) =>
      allVariants.some((v) => v.toLowerCase() === b.name.toLowerCase())
  );
  const position = brandPositionIdx >= 0 ? brandPositionIdx + 1 : 1;

  const contextSnippet = extractContextSnippet(responseText, matchedVariant!);
  const sentiment = detectSentiment(responseText, brandName);

  const competitors = extractCompetitorBrands(responseText, allVariants);

  return {
    mentioned,
    position,
    contextSnippet,
    sentiment,
    competitors,
  };
}
