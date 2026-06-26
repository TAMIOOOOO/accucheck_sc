import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const eventSource = new EventSource("/api/events", { withCredentials: true });

    eventSource.addEventListener("change", (e: MessageEvent) => {
      const collection = e.data as string;

      if (collection === "queue") {
        queryClient.invalidateQueries({ queryKey: [api.queue.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      } else if (collection === "patients") {
        queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.patients.get.path] });
        queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      } else if (collection === "consultations") {
        queryClient.invalidateQueries({ queryKey: [api.consultations.listByPatient.path] });
        queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
        queryClient.invalidateQueries({ queryKey: [api.queue.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.reports.get.path] });
      }
    });

    return () => {
      eventSource.close();
    };
  }, [enabled, queryClient]);
}
