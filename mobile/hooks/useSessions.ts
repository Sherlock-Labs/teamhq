import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { SessionMetadata } from "../types/api";

interface SessionsResponse {
  sessions: SessionMetadata[];
}

export function useSessions(projectId: string) {
  return useQuery({
    queryKey: ["sessions", projectId],
    queryFn: async () => {
      const res = await apiFetch<SessionsResponse>(
        `/api/projects/${projectId}/sessions`,
      );
      return res.sessions;
    },
    staleTime: 30_000,
    enabled: !!projectId,
  });
}
