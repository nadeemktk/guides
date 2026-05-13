export interface MentionResult {
  mentioned: boolean;
  position: number | null;
  contextSnippet: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitors: Array<{ name: string; position: number }>;
}

function buildVariants(name: string): string[] {
  const variants = new Set<string>();
  variants.add(name);
  variants.add(name.toLowerCase());
  variants.add(`${name}'s`);
  variants.add(name.replace(/\s+/g, ""));
  variants.add(name.replace(/\s+/g, "-"));

  // First word only for multi-word brands (if first word is distinctive, length > 4)
  const words = name.split(/\s+/);
  if (words.length > 1 && words[0].length > 4) {
    variants.add(words[0]);
    variants.add(words[0].toLowerCase());
  }

  // Common abbreviations (e.g. "Pest Busters" → "PB")
  if (words.length > 1) {
    const abbr = words.map((w) => w[0]).join("").toUpperCase();
    if (abbr.length >= 2 && abbr.length <= 4) variants.add(abbr);
  }

  return [...variants];
}

function extractContextSnippet(text: string, variant: string): string | null {
  const idx = text.toLowerCase().indexOf(variant.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 120);
  const end = Math.min(text.length, idx + variant.length + 120);
  return text.slice(start, end).trim();
}

function detectSentiment(text: string, brandName: string): "positive" | "neutral" | "negative" {
  const lowerText = text.toLowerCase();
  const brandIdx = lowerText.indexOf(brandName.toLowerCase());
  if (brandIdx === -1) return "neutral";

  const windowStart = Math.max(0, brandIdx - 250);
  const windowEnd = Math.min(text.length, brandIdx + brandName.length + 250);
  const window = lowerText.slice(windowStart, windowEnd);

  const positiveWords = [
    "recommend", "great", "excellent", "best", "top", "love", "fantastic",
    "outstanding", "perfect", "popular", "well-regarded", "highly rated",
    "trusted", "reliable", "reputable", "leading", "top-rated", "award",
    "quality", "professional", "expert", "specialist", "certified",
    "preferred", "go-to", "standout", "impressive", "solid", "strong",
  ];
  const negativeWords = [
    "avoid", "poor", "worst", "bad", "terrible", "disappointing", "overpriced",
    "not recommend", "issues", "problems", "unreliable", "scam", "fraud",
    "complaint", "negative review", "stay away", "beware",
  ];

  const positiveCount = positiveWords.filter((w) => window.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => window.includes(w)).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

// Comprehensive stopwords — anything that shouldn't be treated as a brand name
const BRAND_STOPWORDS = new Set([
  // Pronouns and articles
  "I", "You", "We", "They", "He", "She", "It", "Me", "Us", "Them",
  "The", "A", "An", "This", "That", "These", "Those", "My", "Your",
  "Our", "Their", "Its", "His", "Her",
  // Common adjectives
  "Best", "Great", "Good", "Top", "High", "Low", "New", "Old", "Big",
  "Small", "Large", "Long", "Short", "Fast", "Slow", "Free", "Easy",
  "Hard", "Strong", "Weak", "Full", "Empty", "Real", "True", "False",
  "Right", "Wrong", "First", "Last", "Next", "More", "Most", "Some",
  "Any", "All", "Other", "Same", "Similar", "Different", "Better", "Worse",
  // Common verbs
  "Is", "Are", "Was", "Were", "Be", "Been", "Being", "Have", "Has", "Had",
  "Do", "Does", "Did", "Get", "Got", "Make", "Made", "Use", "Used",
  "Find", "Know", "See", "Look", "Come", "Go", "Take", "Give", "Keep",
  "Start", "Try", "Need", "Want", "Choose", "Consider", "Include",
  // Common nouns that aren't brand names
  "Service", "Services", "Product", "Products", "Brand", "Brands",
  "Company", "Companies", "Business", "Businesses", "Team", "Teams",
  "Customer", "Customers", "User", "Users", "Client", "Clients",
  "Provider", "Providers", "Option", "Options", "Choice", "Choices",
  "Solution", "Solutions", "Market", "Industry", "Category", "Field",
  "Area", "Region", "Country", "City", "Place", "Location",
  "Price", "Prices", "Cost", "Costs", "Value", "Quality", "Feature",
  "Features", "Benefit", "Benefits", "Advantage", "Advantages",
  "Review", "Reviews", "Rating", "Ratings", "Score", "Result", "Results",
  "Information", "Experience", "Website", "Platform", "System", "Tool",
  // Tech/AI words
  "ChatGPT", "Gemini", "Claude", "AI", "LLM", "API", "SEO", "SaaS",
  "Google", "Microsoft", "Meta", "Apple", "Amazon", "OpenAI", "Anthropic",
  // Generic qualifiers
  "Local", "National", "Global", "International", "Professional", "Expert",
  "Certified", "Licensed", "Official", "Leading", "Trusted", "Reliable",
  "Established", "Experienced", "Qualified", "Dedicated", "Specialized",
  // Connectives
  "And", "Or", "But", "For", "With", "On", "In", "At", "To", "Of",
  "By", "From", "About", "Into", "Through", "During", "Before", "After",
  "Above", "Below", "Between", "Among", "Around", "Within", "Without",
  "Here", "There", "Where", "When", "Why", "How", "What", "Which", "Who",
  // Months/days
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December", "Monday", "Tuesday",
  "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  // Numbers / currency
  "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "USD", "AED", "GBP", "EUR", "SGD",
]);

function extractCompetitorBrands(
  text: string,
  ownBrandVariants: string[]
): Array<{ name: string; position: number }> {
  // Look for patterns that indicate a brand is being named:
  // 1. Capitalized proper nouns used as subjects of recommendations
  // 2. Names following "recommend", "consider", "try", "check out", "look at"
  const found: Map<string, number> = new Map();
  const lowerVariants = ownBrandVariants.map((v) => v.toLowerCase());

  // Pattern 1: Multi-word proper nouns (Title Case sequences)
  const multiWordPattern = /\b([A-Z][a-zA-Z]{1,}(?:\s+[A-Z][a-zA-Z]{1,}){1,3})\b/g;
  let match;
  while ((match = multiWordPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (isValidBrandName(candidate, lowerVariants)) {
      const pos = text.slice(0, match.index).split(/\s+/).length;
      if (!found.has(candidate)) found.set(candidate, pos);
    }
  }

  // Pattern 2: Single capitalized words that look like brand names (camelCase or all-caps short)
  const singlePattern = /\b([A-Z][a-z]{2,}[A-Z][a-zA-Z]*|[A-Z]{2,5}(?:\.com)?)\b/g;
  while ((match = singlePattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (isValidBrandName(candidate, lowerVariants) && candidate.length >= 3) {
      const pos = text.slice(0, match.index).split(/\s+/).length;
      if (!found.has(candidate)) found.set(candidate, pos);
    }
  }

  // Pattern 3: Names following recommendation phrases
  const recPattern = /(?:recommend|suggest|consider|try|check out|look at|use|prefer|choose|opt for|go with|known as|called|named|by)\s+([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,2})/g;
  while ((match = recPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (isValidBrandName(candidate, lowerVariants)) {
      const pos = text.slice(0, match.index).split(/\s+/).length;
      if (!found.has(candidate)) found.set(candidate, pos);
    }
  }

  return Array.from(found.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, 8)
    .map(([name, position]) => ({ name, position }));
}

function isValidBrandName(candidate: string, ownVariantsLower: string[]): boolean {
  if (candidate.length < 3 || candidate.length > 60) return false;
  if (BRAND_STOPWORDS.has(candidate)) return false;
  if (ownVariantsLower.includes(candidate.toLowerCase())) return false;
  // Skip if it's all uppercase and long (likely an acronym phrase, not brand)
  if (/^[A-Z]{5,}$/.test(candidate)) return false;
  // Skip if it contains common non-brand patterns
  if (/^(There|When|While|Since|Because|Although|However|Therefore|Moreover|Furthermore|Additionally)$/.test(candidate)) return false;
  return true;
}

export function detectMention(
  responseText: string,
  brandName: string,
  brandAliases: string[] = []
): MentionResult {
  if (!responseText || responseText.trim().length < 10) {
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

  const allVariantsLower = allVariants.map((v) => v.toLowerCase());
  const competitors = extractCompetitorBrands(responseText, allVariants);

  if (!mentioned) {
    return { mentioned: false, position: null, contextSnippet: null, sentiment: null, competitors };
  }

  // Find position: what brand number is this in the response?
  const allBrandsInOrder = extractCompetitorBrands(responseText, []);
  const ownBrandIndex = allBrandsInOrder.findIndex((b) =>
    allVariantsLower.includes(b.name.toLowerCase())
  );
  const position = ownBrandIndex >= 0 ? ownBrandIndex + 1 : 1;

  const contextSnippet = extractContextSnippet(responseText, matchedVariant!);
  const sentiment = detectSentiment(responseText, brandName);

  return {
    mentioned,
    position,
    contextSnippet,
    sentiment,
    competitors,
  };
}
