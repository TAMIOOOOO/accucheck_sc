import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/layout";
import { DoctorPasswordDialog } from "@/components/doctor-password-dialog";
import { useQueue, useUpdateQueueStatus, useAddToQueue, useReorderQueue } from "@/hooks/use-queue";
import { usePatients } from "@/hooks/use-patients";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { formatPHTime, isSamePHDay, getPHToday, getPHTodayStr } from "@/lib/ph-time";
import {
  Clock, CheckCircle2, ChevronRight, Stethoscope, Plus, Search,
  ArrowUp, ArrowDown, UserPlus, XCircle, Paperclip, FileText, ImageIcon, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1200;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QueuePage() {
  const { data: queue, isLoading } = useQueue();
  const updateStatus = useUpdateQueueStatus();
  const addToQueue = useAddToQueue();
  const reorderQueue = useReorderQueue();
  const { data: allPatients } = usePatients();
  const [, navigate] = useLocation();
  const searchStr = useSearch();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [complaint, setComplaint] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [pulseRate, setPulseRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [noShowEntryId, setNoShowEntryId] = useState<number | null>(null);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [pendingConsultEntry, setPendingConsultEntry] = useState<any>(null);
  const [labFiles, setLabFiles] = useState<File[]>([]);
  const [isUploadingLabs, setIsUploadingLabs] = useState(false);
  const [labUploadWarnings, setLabUploadWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const phToday = getPHToday();

  const activeQueue = queue?.filter(
    (q: any) => (q.status === 'Waiting' || q.status === 'In Consultation') && isSamePHDay(q.time, phToday)
  ) || [];
  const completedQueue = queue?.filter(
    (q: any) => q.status === 'Completed' && isSamePHDay(q.time, phToday)
  ) || [];
  const noShowQueue = queue?.filter(
    (q: any) => q.status === 'No-show' && isSamePHDay(q.time, phToday)
  ) || [];

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const newPatientId = params.get("newPatientId");
    if (newPatientId) {
      setSelectedPatientId(Number(newPatientId));
      setAddModalOpen(true);
      navigate("/queue", { replace: true });
    }
  }, [searchStr]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Waiting': return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'In Consultation': return 'border-blue-200 bg-blue-50 text-blue-700';
      default: return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'Scheduled') {
      return <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">Scheduled</span>;
    }
    if (type === 'Follow-up') {
      return <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded shrink-0">Follow-up</span>;
    }
    return <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">Walk-in</span>;
  };

  const getTimeLabel = (entry: any) => {
    if (!entry.time) return null;
    const isScheduled = entry.type === 'Scheduled' || entry.type === 'Follow-up';
    return isScheduled
      ? `Scheduled for ${formatPHTime(entry.time)}`
      : `Since ${formatPHTime(entry.time)}`;
  };

  const canMarkNoShow = (entry: any) => {
    if (entry.type === 'Walk-in') return true;
    if (!entry.time) return false;
    return new Date() > new Date(entry.time);
  };

  const handleNoShow = (id: number) => {
    setNoShowEntryId(id);
  };

  const confirmNoShow = () => {
    if (noShowEntryId !== null) {
      updateStatus.mutate({ id: noShowEntryId, status: 'No-show' });
      setNoShowEntryId(null);
    }
  };

  const handleConsultClick = (entry: any) => {
    setPendingConsultEntry(entry);
    setDoctorDialogOpen(true);
  };

  const handleDoctorVerified = () => {
    if (!pendingConsultEntry) return;
    const entry = pendingConsultEntry;
    setPendingConsultEntry(null);
    updateStatus.mutate(
      { id: entry.id, status: 'In Consultation' },
      { onSuccess: () => navigate(`/patients/${entry.patient.id}/consultations/new?queueEntryId=${entry.id}`) }
    );
  };

  const filteredPatients = allPatients?.filter((p: any) => {
    if (!patientSearch) return true;
    const lower = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(lower) || p.patientId.toLowerCase().includes(lower);
  }) || [];

  const selectedPatient = allPatients?.find((p: any) => p.id === selectedPatientId);

  const resetModal = () => {
    setAddModalOpen(false);
    setPatientSearch("");
    setSelectedPatientId(null);
    setComplaint("");
    setScheduleDate("");
    setScheduleTime("");
    setWeight("");
    setBloodPressure("");
    setPulseRate("");
    setTemperature("");
    setLabFiles([]);
    setLabUploadWarnings([]);
  };

  const uploadLabFiles = async (entryId: number, patientId: number, files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingLabs(true);
    const MAX_BASE64_CHARS = 950_000;
    const MAX_PDF_BYTES = 700_000;
    const warnings: string[] = [];
    try {
      await Promise.all(files.map(async (file) => {
        const isImage = file.type.startsWith("image/");
        if (!isImage && file.size > MAX_PDF_BYTES) {
          warnings.push(`"${file.name}" exceeds 700 KB limit for PDFs — skipped.`);
          return;
        }
        let data: string;
        try {
          data = isImage ? await compressImage(file) : await fileToBase64(file);
        } catch {
          warnings.push(`"${file.name}" could not be read — skipped.`);
          return;
        }
        if (data.length > MAX_BASE64_CHARS) {
          warnings.push(`"${file.name}" is still too large after processing — skipped.`);
          return;
        }
        const res = await fetch("/api/lab-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId,
            queueEntryId: entryId,
            filename: file.name,
            mimeType: isImage ? "image/jpeg" : file.type,
            data,
          }),
        });
        if (!res.ok) {
          warnings.push(`"${file.name}" failed to upload — server error.`);
        }
      }));
    } finally {
      setIsUploadingLabs(false);
    }
    if (warnings.length > 0) {
      toast({
        title: "Some files were not uploaded",
        description: warnings.join(" "),
        variant: "destructive",
      });
    }
  };

  const handleAddToQueue = () => {
    if (!selectedPatientId || !complaint) return;
    const vitals = {
      weight: weight.trim() || null,
      bloodPressure: bloodPressure.trim() || null,
      pulseRate: pulseRate.trim() || null,
      temperature: temperature.trim() || null,
    };
    const filesToUpload = [...labFiles];
    const patientId = selectedPatientId;
    if (scheduleDate) {
      const timeStr = scheduleTime
        ? `${scheduleDate}T${scheduleTime}:00+08:00`
        : `${scheduleDate}T00:00:00+08:00`;
      addToQueue.mutate(
        { patientId, complaint, time: new Date(timeStr), type: "Scheduled", status: "Waiting", ...vitals } as any,
        {
          onSuccess: async (entry) => {
            resetModal();
            await uploadLabFiles(entry.id, patientId, filesToUpload);
          }
        }
      );
    } else {
      addToQueue.mutate({ patientId, complaint, type: "Walk-in", status: "Waiting", ...vitals }, {
        onSuccess: async (entry) => {
          resetModal();
          await uploadLabFiles(entry.id, patientId, filesToUpload);
        },
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const items = [...activeQueue];
    const newEntries = items.map((item: any, i: number) => ({
      id: item.id,
      order: i === index ? items[index - 1].order : i === index - 1 ? items[index].order : item.order,
    }));
    reorderQueue.mutate(newEntries);
  };

  const handleMoveDown = (index: number) => {
    if (index >= activeQueue.length - 1) return;
    const items = [...activeQueue];
    const newEntries = items.map((item: any, i: number) => ({
      id: item.id,
      order: i === index ? items[index + 1].order : i === index + 1 ? items[index].order : item.order,
    }));
    reorderQueue.mutate(newEntries);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Queue</h1>
            <p className="text-slate-500 mt-1">Manage today's patient flow.</p>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="bg-primary shadow-md shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Add to Queue
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Active Queue */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" /> Waiting & In Progress
            </h2>

            {isLoading ? (
              <div className="p-12 flex justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : activeQueue.length > 0 ? (
              <div className="space-y-3">
                {activeQueue.map((entry: any, index: number) => (
                  <Card key={entry.id} className={`border-l-4 shadow-sm hover:shadow-md transition-all ${entry.status === 'In Consultation' ? 'border-l-blue-500' : 'border-l-amber-500'}`}>
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Reorder arrows — only for Waiting */}
                      {entry.status === 'Waiting' && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || reorderQueue.isPending}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === activeQueue.length - 1 || reorderQueue.isPending}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {entry.status === 'In Consultation' && (
                        <div className="w-7 shrink-0" />
                      )}

                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0 overflow-hidden">
                        {entry.patient.photo ? (
                          <img src={entry.patient.photo} alt={entry.patient.name} className="w-full h-full object-cover" />
                        ) : (
                          entry.patient.name.charAt(0)
                        )}
                      </div>

                      {/* Name & complaint */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/patients/${entry.patient.id}`} className="font-bold text-lg text-slate-900 hover:text-primary transition-colors block truncate">
                          {entry.patient.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {entry.complaint}
                          </span>
                          {getTypeBadge(entry.type)}
                          {getTimeLabel(entry) && (
                            <span className="text-xs text-slate-400">
                              {getTimeLabel(entry)}
                            </span>
                          )}
                        </div>
                        {(entry.weight || entry.bloodPressure || entry.pulseRate || entry.temperature) && (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {entry.weight && (
                              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                ⚖ {entry.weight}
                              </span>
                            )}
                            {entry.bloodPressure && (
                              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                BP {entry.bloodPressure}
                              </span>
                            )}
                            {entry.pulseRate && (
                              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                PR {entry.pulseRate}
                              </span>
                            )}
                            {entry.temperature && (
                              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                T {entry.temperature}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status badge + actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Read-only status badge */}
                        <span className={`px-3 py-1.5 rounded-md text-sm font-medium border ${getStatusColor(entry.status)}`}>
                          {entry.status}
                        </span>

                        {/* No-Show button — Walk-in: always while Waiting; Scheduled/Follow-up: only after scheduled time has passed */}
                        {entry.status === 'Waiting' && canMarkNoShow(entry) && (
                          <Button
                            size="icon" variant="ghost"
                            className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            title="Mark as No-Show"
                            onClick={() => handleNoShow(entry.id)}
                            disabled={updateStatus.isPending}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        )}

                        {/* Consult button — sets In Consultation and navigates */}
                        {entry.status !== 'In Consultation' && (
                          <Button
                            size="icon" variant="ghost"
                            className="h-10 w-10 text-primary hover:bg-primary/10"
                            title="Start Consultation"
                            onClick={() => handleConsultClick(entry)}
                            disabled={updateStatus.isPending}
                          >
                            <Stethoscope className="h-5 w-5" />
                          </Button>
                        )}
                        {entry.status === 'In Consultation' && (
                          <Button
                            size="icon" variant="ghost"
                            className="h-10 w-10 text-primary hover:bg-primary/10"
                            title="Record Consultation"
                            onClick={() => handleConsultClick(entry)}
                          >
                            <Stethoscope className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-slate-200 bg-transparent shadow-none">
                <CardContent className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">No active patients.</p>
                  <p className="text-sm">Click "Add to Queue" to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right panel: Completed + No-Show */}
          <div className="space-y-6">
            {/* Completed Today */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Completed Today
              </h2>
              <Card className="border-slate-100 shadow-sm bg-slate-50/50">
                <CardContent className="p-0">
                  {!isLoading && completedQueue.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {completedQueue.map((entry: any) => (
                        <div key={entry.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-700 line-clamp-1">{entry.patient.name}</p>
                            <p className="text-xs text-slate-400">Done at {formatPHTime(entry.time)}</p>
                          </div>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <Link href={`/patients/${entry.patient.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-400">
                      No completed consultations yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* No-Show Today */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" /> No-Show Today
              </h2>
              <Card className="border-slate-100 shadow-sm bg-slate-50/50">
                <CardContent className="p-0">
                  {!isLoading && noShowQueue.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {noShowQueue.map((entry: any) => (
                        <div key={entry.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-700 line-clamp-1">{entry.patient.name}</p>
                            <p className="text-xs text-slate-400">Queued at {formatPHTime(entry.time)}</p>
                          </div>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <Link href={`/patients/${entry.patient.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-400">
                      No no-show patients today.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Queue Dialog */}
      <Dialog open={addModalOpen} onOpenChange={(open) => { if (!open) resetModal(); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Patient to Queue</DialogTitle>
            <DialogDescription>Search for an existing patient or register a new one.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient by name or ID..."
                className="pl-9"
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(null); }}
              />
            </div>

            {selectedPatient ? (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 overflow-hidden">
                  {selectedPatient.photo ? (
                    <img src={selectedPatient.photo} alt={selectedPatient.name} className="w-full h-full object-cover" />
                  ) : selectedPatient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{selectedPatient.name}</p>
                  <p className="text-xs text-slate-500">{selectedPatient.patientId} - {selectedPatient.contact}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatientId(null)}>Change</Button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg max-h-[200px] overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p: any) => (
                    <button
                      key={p.id} type="button"
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                      onClick={() => { setSelectedPatientId(p.id); setPatientSearch(""); }}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                        {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.patientId}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400">No patients found</div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="complaint">Chief Complaint *</Label>
              <Input
                id="complaint" placeholder="Brief reason for visit"
                value={complaint} onChange={(e) => setComplaint(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vitals (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="weight" className="text-xs">Weight</Label>
                  <Input id="weight" placeholder="e.g. 65 kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bloodPressure" className="text-xs">Blood Pressure</Label>
                  <Input id="bloodPressure" placeholder="e.g. 120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pulseRate" className="text-xs">Pulse Rate</Label>
                  <Input id="pulseRate" placeholder="e.g. 72 bpm" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="temperature" className="text-xs">Temperature</Label>
                  <Input id="temperature" placeholder="e.g. 36.5 °C" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lab Results (Optional)</p>
              <label className="flex items-center gap-2 cursor-pointer w-full border border-dashed border-slate-300 rounded-lg px-4 py-3 hover:border-primary/60 hover:bg-slate-50 transition-colors">
                <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500">Attach images or PDF files…</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const MAX_PDF_BYTES = 700_000;
                    const added: File[] = [];
                    const rejected: string[] = [];
                    Array.from(e.target.files ?? []).forEach((f) => {
                      if (!f.type.startsWith("image/") && f.size > MAX_PDF_BYTES) {
                        rejected.push(`"${f.name}" exceeds 700 KB limit for PDFs.`);
                      } else {
                        added.push(f);
                      }
                    });
                    setLabFiles((prev) => [...prev, ...added]);
                    if (rejected.length > 0) setLabUploadWarnings(rejected);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-slate-400">Images are auto-compressed. PDFs max 700 KB.</p>
              {labUploadWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
                  {labUploadWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700">{w}</p>
                  ))}
                </div>
              )}
              {labFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {labFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs rounded-full px-3 py-1">
                      {f.type.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button type="button" onClick={() => setLabFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDate">Schedule for Date (Optional)</Label>
                <Input id="scheduleDate" type="date" min={getPHTodayStr()} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Time (Optional)</Label>
                <Input id="scheduleTime" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} disabled={!scheduleDate} />
              </div>
            </div>
            {scheduleDate && scheduleDate < getPHTodayStr() && (
              <p className="text-xs text-red-500 font-medium">Cannot schedule for a date that has already passed.</p>
            )}
            {scheduleDate && scheduleDate >= getPHTodayStr() && (
              <p className="text-xs text-primary font-medium">This patient will be scheduled for a future date, not added to today's queue.</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <Button variant="outline" className="w-full border-dashed border-2"
              onClick={() => { resetModal(); navigate("/patients/new?fromQueue=true"); }}>
              <UserPlus className="mr-2 h-4 w-4" /> Register New Patient
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetModal} disabled={isUploadingLabs}>Cancel</Button>
            <Button onClick={handleAddToQueue} disabled={!selectedPatientId || !complaint || (!!scheduleDate && scheduleDate < getPHTodayStr()) || addToQueue.isPending || isUploadingLabs}>
              {(addToQueue.isPending || isUploadingLabs) && <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {isUploadingLabs ? "Uploading…" : scheduleDate ? "Save Schedule" : "Add to Queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DoctorPasswordDialog
        open={doctorDialogOpen}
        onOpenChange={(open) => { setDoctorDialogOpen(open); if (!open) setPendingConsultEntry(null); }}
        onSuccess={handleDoctorVerified}
      />

      {/* No-Show Confirmation */}
      <AlertDialog open={noShowEntryId !== null} onOpenChange={(open) => { if (!open) setNoShowEntryId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as No-Show?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the patient as a no-show and remove them from the active queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmNoShow}
              disabled={updateStatus.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {updateStatus.isPending && <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              Yes, Mark No-Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
