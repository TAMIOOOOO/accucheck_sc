import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import type { QueueEntry } from "@shared/schema";

export function useQueue() {
  return useQuery({
    queryKey: [api.queue.list.path],
    queryFn: async () => {
      const res = await fetch(api.queue.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch queue");
      return await res.json();
    },
  });
}

export function useAddToQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.queue.create.input>) => {
      const res = await fetch(api.queue.create.path, {
        method: api.queue.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add to queue");
      return api.queue.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.list.path] });
    },
  });
}

export function useReorderQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: { id: number; order: number }[]) => {
      const res = await fetch(api.queue.reorder.path, {
        method: api.queue.reorder.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reorder queue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.list.path] });
    },
  });
}

export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.queue.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.queue.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.queue.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
