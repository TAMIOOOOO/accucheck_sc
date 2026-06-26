import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

class HttpError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "HttpError";
  }
}

export function useConsultations(patientId: number) {
  return useQuery({
    queryKey: [api.consultations.listByPatient.path, patientId],
    queryFn: async () => {
      const url = buildUrl(api.consultations.listByPatient.path, { id: patientId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch consultations");
      return api.consultations.listByPatient.responses[200].parse(await res.json());
    },
    enabled: !!patientId,
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.consultations.create.input>) => {
      const res = await fetch(api.consultations.create.path, {
        method: api.consultations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.message || "Failed to record consultation";
        throw new HttpError(msg, res.status);
      }
      return api.consultations.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.consultations.listByPatient.path, variables.patientId] 
      });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.queue.list.path] });
    },
  });
}

export function useDeleteConsultation(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await fetch(`/api/consultations/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (res.status === 403) throw new Error("Incorrect password");
      if (!res.ok) throw new Error("Failed to delete consultation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.consultations.listByPatient.path, patientId],
      });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
