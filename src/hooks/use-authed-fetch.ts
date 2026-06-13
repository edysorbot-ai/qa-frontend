"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export type AuthedFetchInit = RequestInit & { json?: any; signal?: AbortSignal };

/**
 * Hook returning a `fetch` wrapper that automatically:
 *  - injects the Clerk bearer token
 *  - sets Content-Type when `json` body is given
 *  - throws on non-2xx with the response text as message
 */
export function useAuthedFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (url: string, init: AuthedFetchInit = {}): Promise<Response> => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(init.headers as any),
        Authorization: `Bearer ${token}`,
      };
      let body = init.body;
      if (init.json !== undefined) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        body = JSON.stringify(init.json);
      }
      const res = await fetch(url, { ...init, headers, body });
      return res;
    },
    [getToken],
  );
}

/** Same as useAuthedFetch but returns parsed JSON and throws on !ok. */
export function useAuthedJson() {
  const af = useAuthedFetch();
  return useCallback(
    async <T = any>(url: string, init: AuthedFetchInit = {}): Promise<T> => {
      const r = await af(url, init);
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
      }
      return (await r.json()) as T;
    },
    [af],
  );
}
