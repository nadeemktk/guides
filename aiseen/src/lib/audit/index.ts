import { scrapeStore } from "./scraper";
import { generateQueries } from "./queryGenerator";
import { runQueryAgainstProviders } from "./llmRunner";
import { detectMention } from "./mentionDetector";
import { computeScore, buildAuditSummary } from "./scorer";
import type { QueryResult } from "./scorer";
import type { FreeAuditProvider } from "./llmRunner";

export { scrapeStore, generateQueries, detectMention, computeScore };
export type { QueryResult };

const FREE_AUDIT_PROVIDERS: FreeAuditProvider[] = ["openai", "gemini", "perplexity"];

export interface AuditProgress {
  step: "scraping" | "generating" | "running" | "scoring" | "completed" | "failed";
  completedQueries: number;
  totalQueries: number;
  partialResults: QueryResult[];
}

export type ProgressCallback = (progress: AuditProgress) => void | Promise<void>;

export async function runFreeAudit(
  storeUrl: string,
  onProgress?: ProgressCallback
): Promise<{
  brandName: string;
  storeName: string;
  summary: ReturnType<typeof buildAuditSummary>;
}> {
  // Step 1: Scrape store
  await onProgress?.({ step: "scraping", completedQueries: 0, totalQueries: 0, partialResults: [] });
  const scraped = await scrapeStore(storeUrl);

  // Step 2: Generate queries
  await onProgress?.({ step: "generating", completedQueries: 0, totalQueries: 25, partialResults: [] });
  const queries = await generateQueries(scraped.brandName, scraped.products, 25);

  // Step 3: Run queries against LLMs in batches of 5 for progress updates
  const queryResults: QueryResult[] = [];
  const BATCH_SIZE = 5;

  await onProgress?.({ step: "running", completedQueries: 0, totalQueries: queries.length, partialResults: [] });

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (query) => {
        const llmResults = await runQueryAgainstProviders(
          query.query_text,
          FREE_AUDIT_PROVIDERS
        );

        const resultsByProvider = {} as QueryResult["results"];
        for (const llmResult of llmResults) {
          const mention = detectMention(
            llmResult.responseText,
            scraped.brandName,
            []
          );
          resultsByProvider[llmResult.provider as FreeAuditProvider] = {
            mentioned: mention.mentioned,
            position: mention.position,
            contextSnippet: mention.contextSnippet,
            sentiment: mention.sentiment,
            competitors: mention.competitors,
            responseText: llmResult.responseText,
            error: llmResult.error,
          };
        }

        return { query, results: resultsByProvider } satisfies QueryResult;
      })
    );

    queryResults.push(...batchResults);

    await onProgress?.({
      step: "running",
      completedQueries: queryResults.length,
      totalQueries: queries.length,
      partialResults: queryResults,
    });
  }

  // Step 4: Score
  await onProgress?.({ step: "scoring", completedQueries: queries.length, totalQueries: queries.length, partialResults: queryResults });
  const score = computeScore(queryResults);
  const summary = buildAuditSummary(queryResults, score);

  await onProgress?.({ step: "completed", completedQueries: queries.length, totalQueries: queries.length, partialResults: queryResults });

  return {
    brandName: scraped.brandName,
    storeName: scraped.storeName,
    summary,
  };
}
