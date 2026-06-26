import { useLocation, useParams, useSearch, Link } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout";
import { usePatient } from "@/hooks/use-patients";
import { useCreateConsultation } from "@/hooks/use-consultations";
import { useQueueLabResults, type LabResultFull } from "@/hooks/use-lab-results";
import { api, buildUrl } from "@shared/routes";
import type { QueueEntry } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Stethoscope, Loader2, Pill, Plus, Trash2, FlaskConical, FileText, ImageIcon, ExternalLink, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { DoctorPasswordDialog } from "@/components/doctor-password-dialog";
import { getPHTodayStr } from "@/lib/ph-time";

function openBase64File(dataUrl: string, filename: string) {
  try {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { window.open(dataUrl, "_blank"); return; }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    const bytes = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    window.open(dataUrl, "_blank");
  }
}

const medicationSchema = z.object({
  name: z.string().min(1, "Required"),
  dosage: z.string().min(1, "Required"),
  qty: z.string().min(1, "Required"),
});

const formSchema = z.object({
  symptoms: z.string().min(1, "Required"),
  historyOfPresentIllness: z.string().optional(),
  diagnosis: z.string().min(1, "Required"),
  medications: z.array(medicationSchema).min(0).default([]),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpTime: z.string().optional(),
});

export default function NewConsultation() {
  const params = useParams();
  const patientId = Number(params.id);
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<z.infer<typeof formSchema> | null>(null);
  const [expandedImage, setExpandedImage] = useState<LabResultFull | null>(null);
  const [labPanelOpen, setLabPanelOpen] = useState(true);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);

  const rawQueueEntryId = new URLSearchParams(searchStr).get("queueEntryId");
  const queueEntryId: number | null = rawQueueEntryId && !isNaN(Number(rawQueueEntryId)) && Number(rawQueueEntryId) > 0
    ? Number(rawQueueEntryId)
    : null;
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!queueEntryId) return;
    fetch(`/api/queue/${queueEntryId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((entry) => { if (entry) setQueueEntry(entry); })
      .catch(() => {});
  }, [queueEntryId]);

  useEffect(() => {
    return () => {
      if (!submittedRef.current && queueEntryId) {
        const url = buildUrl(api.queue.updateStatus.path, { id: queueEntryId });
        fetch(url, {
          method: api.queue.updateStatus.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Waiting" }),
          credentials: "include",
        }).catch(() => {});
      }
    };
  }, [queueEntryId]);

  const { data: patient, isLoading: patientLoading } = usePatient(patientId);
  const createMutation = useCreateConsultation();
  const { data: queueLabResults } = useQueueLabResults(queueEntryId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symptoms: "",
      historyOfPresentIllness: "",
      diagnosis: "",
      medications: [],
      notes: "",
      followUpDate: "",
      followUpTime: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const submitPayload = (data: z.infer<typeof formSchema>) => {
    const followUpStr = data.followUpDate
      ? (data.followUpTime
          ? `${data.followUpDate}T${data.followUpTime}:00+08:00`
          : `${data.followUpDate}T00:00:00+08:00`)
      : null;

    createMutation.mutate(
      {
        symptoms: data.symptoms,
        historyOfPresentIllness: data.historyOfPresentIllness || null,
        diagnosis: data.diagnosis,
        prescription: JSON.stringify(data.medications),
        notes: data.notes || null,
        followUpDate: followUpStr ? new Date(followUpStr) : null,
        patientId,
        queueEntryId: queueEntryId ?? null,
      },
      {
        onSuccess: () => {
          submittedRef.current = true;
          setLocation(`/patients/${patientId}`);
        },
        onError: (err: Error & { status?: number }) => {
          if (err.status === 403) {
            setPendingSubmit(data);
            setDoctorDialogOpen(true);
          }
        },
      }
    );
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    submitPayload(data);
  };

  const handleDoctorVerifiedAndResubmit = () => {
    if (pendingSubmit) {
      const data = pendingSubmit;
      setPendingSubmit(null);
      submitPayload(data);
    }
  };

  if (patientLoading) return <AppLayout><div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  if (!patient) return <AppLayout><div className="p-12 text-center">Patient not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100">
            <Link href={`/patients/${patientId}`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Record Consultation</h1>
            <p className="text-sm font-medium text-primary">Patient: {patient.name}</p>
          </div>
        </div>

        {expandedImage && (
          <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
            <DialogContent className="max-w-3xl p-2">
              <img
                src={expandedImage.data}
                alt={expandedImage.filename}
                className="w-full h-auto rounded"
              />
            </DialogContent>
          </Dialog>
        )}

        {queueEntry && (queueEntry.weight || queueEntry.bloodPressure || queueEntry.pulseRate || queueEntry.temperature) && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50/50 bg-slate-50/30 py-3 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Vitals at Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {queueEntry.weight && (
                  <div><p className="text-xs text-slate-500 mb-0.5">Weight</p><p className="font-medium">{queueEntry.weight}</p></div>
                )}
                {queueEntry.bloodPressure && (
                  <div><p className="text-xs text-slate-500 mb-0.5">Blood Pressure</p><p className="font-medium">{queueEntry.bloodPressure}</p></div>
                )}
                {queueEntry.pulseRate && (
                  <div><p className="text-xs text-slate-500 mb-0.5">Pulse Rate</p><p className="font-medium">{queueEntry.pulseRate}</p></div>
                )}
                {queueEntry.temperature && (
                  <div><p className="text-xs text-slate-500 mb-0.5">Temperature</p><p className="font-medium">{queueEntry.temperature}</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {queueEntryId && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader
              className="border-b border-slate-50/50 bg-slate-50/30 py-3 px-6 cursor-pointer select-none"
              onClick={() => setLabPanelOpen((o) => !o)}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Lab Results for this Visit
                  {queueLabResults && queueLabResults.length > 0 && (
                    <span className="text-xs font-normal bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {queueLabResults.length}
                    </span>
                  )}
                </span>
                {labPanelOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </CardTitle>
            </CardHeader>
            {labPanelOpen && (
              <CardContent className="p-6">
                {!queueLabResults || queueLabResults.length === 0 ? (
                  <p className="text-sm text-slate-400">No lab results attached for this visit.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {queueLabResults.map((lr) => {
                      const isImage = lr.mimeType.startsWith("image/");
                      return (
                        <div
                          key={lr.id}
                          className="border border-slate-200 rounded-lg overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => isImage ? setExpandedImage(lr) : openBase64File(lr.data, lr.filename)}
                        >
                          {isImage ? (
                            <img
                              src={lr.data}
                              alt={lr.filename}
                              className="w-full h-28 object-cover"
                            />
                          ) : (
                            <div className="w-full h-28 flex items-center justify-center bg-slate-50">
                              <FileText className="h-10 w-10 text-slate-400" />
                            </div>
                          )}
                          <div className="p-2 bg-white">
                            <p className="text-xs text-slate-600 truncate">{lr.filename}</p>
                            <button
                              type="button"
                              className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => { e.stopPropagation(); openBase64File(lr.data, lr.filename); }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50/50 bg-slate-50/30">
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Clinical Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="symptoms" className="text-base font-semibold">Symptoms / Chief Complaint *</Label>
                <Textarea 
                  id="symptoms" 
                  {...form.register("symptoms")} 
                  className="min-h-[100px] text-base resize-none border-slate-200 focus-visible:ring-primary/20" 
                  placeholder="Patient reports..."
                />
                {form.formState.errors.symptoms && <p className="text-xs text-destructive">{form.formState.errors.symptoms.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="historyOfPresentIllness" className="text-base font-semibold">History of Present Illness</Label>
                <Textarea 
                  id="historyOfPresentIllness" 
                  {...form.register("historyOfPresentIllness")} 
                  className="min-h-[100px] text-base resize-none border-slate-200 focus-visible:ring-primary/20" 
                  placeholder="Onset, duration, character, associated symptoms, relieving/aggravating factors..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis" className="text-base font-semibold">Diagnosis *</Label>
                <Input 
                  id="diagnosis" 
                  {...form.register("diagnosis")} 
                  className="h-12 text-base font-medium border-slate-200 focus-visible:ring-primary/20" 
                  placeholder="Primary diagnosis"
                />
                {form.formState.errors.diagnosis && <p className="text-xs text-destructive">{form.formState.errors.diagnosis.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50/50 bg-slate-50/30">
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Treatment & Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Prescription <span className="font-normal text-slate-400 text-sm">(Optional)</span></Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ name: "", dosage: "", qty: "" })}>
                    <Plus className="h-4 w-4 mr-1" /> Add Medicine
                  </Button>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex bg-slate-50 border-b border-slate-200 font-bold text-sm">
                    <div className="flex-[2] py-2 px-3 border-r border-slate-200">Medicine Name</div>
                    <div className="flex-[1] py-2 px-3 border-r border-slate-200">Dosage</div>
                    <div className="flex-[0.5] py-2 px-3">QTY</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {fields.length === 0 && (
                      <div className="py-4 px-3 text-sm text-slate-400 italic text-center">No medicines — click "Add Medicine" to add one</div>
                    )}
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center group">
                        <div className="flex-[2] border-r border-slate-200">
                          <Input 
                            {...form.register(`medications.${index}.name`)} 
                            placeholder="Medicine Name" 
                            className="border-0 focus-visible:ring-0 rounded-none h-10 px-3"
                          />
                        </div>
                        <div className="flex-[1] border-r border-slate-200">
                          <Input 
                            {...form.register(`medications.${index}.dosage`)} 
                            placeholder="Dosage" 
                            className="border-0 focus-visible:ring-0 rounded-none h-10 px-3"
                          />
                        </div>
                        <div className="flex-[0.5] flex items-center pr-1">
                          <Input 
                            {...form.register(`medications.${index}.qty`)} 
                            placeholder="QTY" 
                            className="border-0 focus-visible:ring-0 rounded-none h-10 px-3"
                          />
                          {fields.length >= 1 && (
                            <Button 
                              type="button" 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {form.formState.errors.medications && <p className="text-xs text-destructive">{form.formState.errors.medications.message}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="notes" className="font-semibold">Additional Notes (Private)</Label>
                  <Textarea 
                    id="notes" 
                    {...form.register("notes")} 
                    className="resize-none min-h-[100px] border-slate-200 focus-visible:ring-primary/20" 
                    placeholder="Internal clinic notes, not printed on Rx"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="followUpDate" className="font-semibold">Follow-up Date (Optional)</Label>
                    <Input 
                      id="followUpDate" 
                      type="date" 
                      min={getPHTodayStr()}
                      {...form.register("followUpDate")} 
                      className="border-slate-200 focus-visible:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followUpTime" className="font-semibold">Follow-up Time (Optional)</Label>
                    <Input 
                      id="followUpTime" 
                      type="time" 
                      {...form.register("followUpTime")} 
                      className="border-slate-200 focus-visible:ring-primary/20" 
                    />
                  </div>
                  <p className="text-xs text-slate-500">Will be printed at the bottom of the Rx.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 sticky bottom-4 z-10 bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-xl">
            <Button type="button" variant="outline" asChild className="border-slate-200">
              <Link href={`/patients/${patientId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 px-8">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Consultation Record
            </Button>
          </div>
        </form>
      </div>

      <DoctorPasswordDialog
        open={doctorDialogOpen}
        onOpenChange={(open) => { setDoctorDialogOpen(open); if (!open) setPendingSubmit(null); }}
        onSuccess={handleDoctorVerifiedAndResubmit}
      />
    </AppLayout>
  );
}
