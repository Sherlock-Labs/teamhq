import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Project } from "../types/api";

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiFetch<Project>(`/api/projects/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}
