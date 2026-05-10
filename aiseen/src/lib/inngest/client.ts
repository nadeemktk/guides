import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "aiseen",
  name: "AISeen",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Typed event definitions
export type Events = {
  "store/sync.requested": {
    data: { storeId: string; userId: string; fullSync: boolean };
  };
  "queries/generate.requested": {
    data: { storeId: string; userId: string; count: number };
  };
  "query/run.requested": {
    data: { queryId: string; storeId: string; provider: string; model: string };
  };
  "mention/detection.requested": {
    data: { queryRunId: string; storeId: string; brandName: string; brandAliases: string[] };
  };
  "recommendations/generate.requested": {
    data: { storeId: string; userId: string };
  };
  "audit/run.requested": {
    data: { auditId: string; storeUrl: string; brandName: string };
  };
};
