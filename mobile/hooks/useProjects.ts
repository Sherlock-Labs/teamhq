import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Project } from "../types/api";

interface ProjectsResponse {
  projects: Project[];
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiFetch<ProjectsResponse>("/api/projects");
      return res.projects;
    },
    staleTime: 30_000,
  });
}
