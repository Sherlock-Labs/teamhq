import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Note, Project } from "../types/api";

export function useAddNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<Note>(`/api/projects/${projectId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    // Optimistic update: append note to cached project immediately
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["projects", projectId] });

      const previous = queryClient.getQueryData<Project>([
        "projects",
        projectId,
      ]);

      if (previous) {
        const optimisticNote: Note = {
          id: `temp-${Date.now()}`,
          content,
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData<Project>(["projects", projectId], {
          ...previous,
          notes: [optimisticNote, ...previous.notes],
        });
      }

      return { previous };
    },
    onError: (_err, _content, context) => {
      // Roll back on error
      if (context?.previous) {
        queryClient.setQueryData(
          ["projects", projectId],
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}
