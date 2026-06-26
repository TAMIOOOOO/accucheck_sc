import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { usePatients, useDeletePatient } from "@/hooks/use-patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Calendar, Phone, ActivitySquare, ChevronRight, Trash2, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DoctorPasswordDialog } from "@/components/doctor-password-dialog";
import { generateAllPatientsPDF } from "@/lib/pdf-export";
import { api, buildUrl } from "@shared/routes";

export default function PatientsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: patients, isLoading } = usePatients(searchTerm);
  const deletePatient = useDeletePatient();
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [doctorDeleteOpen, setDoctorDeleteOpen] = useState(false);
  const [alertDeleteOpen, setAlertDeleteOpen] = useState(false);
  const [bulkDownloadDialogOpen, setBulkDownloadDialogOpen] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const handleBulkDownload = async () => {
    setIsBulkDownloading(true);
    try {
      const allPatientsRes = await fetch(api.patients.list.path, { credentials: "include" });
      if (!allPatientsRes.ok) throw new Error("Failed to fetch patients");
      const allPatients = await allPatientsRes.json();

      if (!allPatients || allPatients.length === 0) {
        toast({ title: "No patients", description: "There are no patient records to export." });
        return;
      }

      const fetchConsultations = async (patientId: number) => {
        const url = buildUrl(api.consultations.listByPatient.path, { id: patientId });
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      };

      const fetchLabResults = async (patientId: number) => {
        const metaRes = await fetch(`/api/patients/${patientId}/lab-results`, { credentials: "include" });
        const meta = metaRes.ok ? await metaRes.json() : [];
        return Promise.all(
          meta.map(async (lr: { id: number; mimeType: string; [key: string]: unknown }) => {
            if (lr.mimeType && String(lr.mimeType).startsWith("image/")) {
              try {
                const r = await fetch(`/api/lab-results/${lr.id}`, { credentials: "include" });
                if (r.ok) return r.json();
              } catch { /* skip */ }
            }
            return { ...lr, data: "" };
          })
        );
      };

      const doc = await generateAllPatientsPDF(allPatients, fetchConsultations, fetchLabResults);
      doc.save("AllPatients_Records.pdf");
      toast({ title: "Export complete", description: `Exported ${allPatients.length} patient record(s).` });
    } catch (err) {
      toast({ title: "Export failed", description: "An error occurred while generating the PDF.", variant: "destructive" });
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePatient.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Patient deleted", description: `${deleteTarget.name} has been removed.` });
        setAlertDeleteOpen(false);
        setDeleteTarget(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete patient.", variant: "destructive" });
        setAlertDeleteOpen(false);
        setDeleteTarget(null);
      },
    });
  };

  const safeBirthdate = (birthdate: string) => {
    try {
      const d = new Date(birthdate);
      if (isNaN(d.getTime())) return "—";
      return format(d, "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patients</h1>
            <p className="text-slate-500 mt-1">Manage patient records and medical history.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-100"
              onClick={() => setBulkDownloadDialogOpen(true)}
              disabled={isBulkDownloading}
            >
              {isBulkDownloading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download All Records</>
              )}
            </Button>
            <Button asChild className="bg-primary shadow-md shadow-primary/20">
              <Link href="/patients/new">
                <Plus className="mr-2 h-4 w-4" /> Register Patient
              </Link>
            </Button>
          </div>
        </div>

        <Card className="border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or ID..." 
                className="pl-9 h-11 bg-white border-slate-200 focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center text-slate-400">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : patients && patients.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {patients.map((patient: any) => (
                  <div key={patient.id} className="flex items-center group hover:bg-slate-50 transition-colors">
                    <Link href={`/patients/${patient.id}`} className="flex-1 min-w-0">
                      <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer">
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                          {patient.photo ? (
                            <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                          ) : (
                            patient.name?.charAt(0) ?? "?"
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">
                              {patient.name || <span className="text-slate-400 italic">No name</span>}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                              {patient.patientId}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {safeBirthdate(patient.birthdate)}</span>
                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {patient.contact || "—"}</span>
                            <span className="flex items-center gap-1.5 capitalize"><ActivitySquare className="h-3.5 w-3.5" /> {patient.gender || "—"}</span>
                          </div>
                        </div>

                        <div className="hidden md:flex shrink-0 items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-400 group-hover:border-primary/30 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </div>
                    </Link>

                    <div className="pr-4 md:pr-5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => { e.preventDefault(); setDeleteTarget({ id: patient.id, name: patient.name || "this patient" }); setDoctorDeleteOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="font-medium text-slate-900 mb-1">No patients found</h3>
                <p>Try adjusting your search or register a new patient.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DoctorPasswordDialog
        open={doctorDeleteOpen}
        onOpenChange={setDoctorDeleteOpen}
        onSuccess={() => setAlertDeleteOpen(true)}
        description="Enter the doctor password to delete this patient record."
      />

      <AlertDialog open={alertDeleteOpen} onOpenChange={(open) => { if (!open) { setAlertDeleteOpen(false); setDeleteTarget(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePatient.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePatient.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deletePatient.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DoctorPasswordDialog
        open={bulkDownloadDialogOpen}
        onOpenChange={setBulkDownloadDialogOpen}
        onSuccess={handleBulkDownload}
        description="Enter the doctor password to download all patient records."
      />
    </AppLayout>
  );
}
