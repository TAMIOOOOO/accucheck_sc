import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LabResultMeta {
  id: number;
  patientId: number;
  queueEntryId: number | null;
  filename: string;
  mimeType: string;
  uploadedAt: string | null;
}

export interface LabResultFull extends LabResultMeta {
  data: string;
}

export function usePatientLabResults(patientId: number) {
  return useQuery<LabResultMeta[]>({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/lab-results`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lab results");
      return res.json();
    },
    enabled: !!patientId,
  });
}

export function useQueueLabResults(queueEntryId: number | null) {
  return useQuery<LabResultFull[]>({
    queryKey: [`/api/queue/${queueEntryId}/lab-results`],
    queryFn: async () => {
      if (!queueEntryId) return [];
      const res = await fetch(`/api/queue/${queueEntryId}/lab-results`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lab results");
      return res.json();
    },
    enabled: !!queueEntryId,
  });
}

export function useDeleteLabResult(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (labResultId: number) => {
      const res = await fetch(`/api/lab-results/${labResultId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete lab result");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
    },
  });
}
