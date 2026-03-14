// ============================================================
// MOCK SUPABASE CLIENT FACTORY
// Creates a chainable mock that simulates Supabase query builder
// for use in tests without hitting a real database.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

interface MockQueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

/**
 * Configurable mock response for a specific table + operation.
 * Key format: "table.operation" e.g. "loan_files.select", "escalations.insert"
 *
 * Value can be a single response or an array of responses.
 * If an array, each call consumes the next response in order.
 * The last response is reused for any subsequent calls.
 */
export type MockResponses = Record<string, MockQueryResult | MockQueryResult[]>;

/**
 * Tracks calls made to the mock Supabase client.
 */
export interface MockCall {
  table: string;
  operation: string;
  args: unknown[];
  filters: Record<string, unknown>;
}

/**
 * Creates a mock Supabase client that supports chainable queries.
 *
 * Usage:
 * ```ts
 * const { client, calls } = createMockSupabase({
 *   "loan_files.select": { data: { id: "abc", doc_workflow_state: "checklist_pending" }, error: null },
 *   "loan_files.update": { data: null, error: null },
 *   // Multiple responses for the same key (consumed in order):
 *   "document_requirements.select": [
 *     { data: { state: "required", loan_file_id: "loan-123" }, error: null },
 *     { data: [{ state: "tentatively_satisfied" }], error: null },
 *   ],
 * });
 * ```
 */
export function createMockSupabase(responses: MockResponses = {}) {
  const calls: MockCall[] = [];
  const callCounters: Record<string, number> = {};

  function getResponse(key: string): MockQueryResult {
    const configured = responses[key];
    if (!configured) return { data: null, error: null };

    if (Array.isArray(configured)) {
      const index = callCounters[key] ?? 0;
      callCounters[key] = index + 1;
      // Return the indexed response, or the last one if we've exceeded the array
      return configured[Math.min(index, configured.length - 1)];
    }

    return configured;
  }

  function createQueryBuilder(table: string, operation: string, args: unknown[]) {
    const filters: Record<string, unknown> = {};
    const call: MockCall = { table, operation, args, filters };
    calls.push(call);

    const key = `${table}.${operation}`;
    // Eagerly resolve the response for this call
    const response = getResponse(key);

    const builder: Record<string, unknown> = {};

    // All chainable filter methods return the builder
    const chainMethods = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or", "match", "order", "limit", "range"];
    for (const method of chainMethods) {
      builder[method] = (...methodArgs: unknown[]) => {
        if (method === "eq" && methodArgs.length >= 2) {
          filters[methodArgs[0] as string] = methodArgs[1];
        }
        return builder;
      };
    }

    // select() can be chained after insert/update, or called directly from .from()
    builder.select = (...selectArgs: unknown[]) => {
      if (operation === "select") {
        call.args = selectArgs;
      }
      return builder;
    };

    // .single() resolves and returns a single row
    builder.single = () => {
      return Promise.resolve(response);
    };

    // Make the builder thenable so `await db.from("x").select().eq()` works
    builder.then = (resolve: (value: MockQueryResult) => void, reject?: (reason: unknown) => void) => {
      return Promise.resolve(response).then(resolve, reject);
    };

    return builder;
  }

  const client = {
    from: (table: string) => ({
      select: (...args: unknown[]) => createQueryBuilder(table, "select", args),
      insert: (...args: unknown[]) => createQueryBuilder(table, "insert", args),
      update: (...args: unknown[]) => createQueryBuilder(table, "update", args),
      delete: (...args: unknown[]) => createQueryBuilder(table, "delete", args),
      upsert: (...args: unknown[]) => createQueryBuilder(table, "upsert", args),
    }),
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

/**
 * Finds all calls to a specific table and operation.
 */
export function findCalls(calls: MockCall[], table: string, operation: string): MockCall[] {
  return calls.filter((c) => c.table === table && c.operation === operation);
}

/**
 * Asserts that a specific table operation was called.
 */
export function expectCalled(calls: MockCall[], table: string, operation: string): void {
  const found = findCalls(calls, table, operation);
  if (found.length === 0) {
    throw new Error(`Expected ${table}.${operation} to be called, but it was not.`);
  }
}
