import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { SessionMetadata } from "../types/api";

export function useSessions(projectId: string) {
  return useQuery({
    queryKey: ["sessions", projectId],
    queryFn: () =>
      apiFetch<SessionMetadata[]>(
        `/api/projects/${projectId}/sessions`,
      ),
    staleTime: 30_000,
    enabled: !!projectId,
  });
}
