import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function usePatients(search?: string) {
  return useQuery({
    queryKey: [api.patients.list.path, search],
    queryFn: async () => {
      const url = new URL(api.patients.list.path, window.location.origin);
      if (search) url.searchParams.set("search", search);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return api.patients.list.responses[200].parse(await res.json());
    },
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: [api.patients.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.patients.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch patient");
      return api.patients.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.patients.create.input>) => {
      const res = await fetch(api.patients.create.path, {
        method: api.patients.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create patient");
      return api.patients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<z.infer<typeof api.patients.create.input>>) => {
      const url = buildUrl(api.patients.update.path, { id });
      const res = await fetch(url, {
        method: api.patients.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update patient");
      return api.patients.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.patients.delete.path, { id });
      const res = await fetch(url, {
        method: api.patients.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete patient");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}
