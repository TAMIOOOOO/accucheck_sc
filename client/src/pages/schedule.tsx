import { useState, useMemo } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { useQueue, useAddToQueue } from "@/hooks/use-queue";
import { usePatients } from "@/hooks/use-patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { formatPHDate, formatPHTime, isSamePHDay, getPHToday, getPHTodayStr, isPHBeforeToday } from "@/lib/ph-time";
import { CalendarDays, Plus, Search, UserPlus, Clock, Paperclip, FileText, ImageIcon, X } from "lucide-react";
import { useLocation } from "wouter";
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

export default function SchedulePage() {
  const { data: queue, isLoading } = useQueue();
  const { data: allPatients } = usePatients();
  const addToQueue = useAddToQueue();
  const [, navigate] = useLocation();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
  const [labFiles, setLabFiles] = useState<File[]>([]);
  const [isUploadingLabs, setIsUploadingLabs] = useState(false);
  const [labUploadWarnings, setLabUploadWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const phToday = getPHToday();

  const scheduleQueue = useMemo(() => {
    return queue?.filter((q: any) => q.type === 'Follow-up' || q.type === 'Scheduled') || [];
  }, [queue]);

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < start.getDay(); i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    return days;
  }, [currentMonth]);

  const getScheduledForDate = (date: Date) => {
    return scheduleQueue.filter((q: any) => isSamePHDay(q.time, date));
  };

  const filteredPatients = allPatients?.filter((p: any) => {
    if (!patientSearch) return true;
    const lower = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(lower) || p.patientId.toLowerCase().includes(lower);
  }) || [];

  const selectedPatient = allPatients?.find((p: any) => p.id === selectedPatientId);

  const openAddModal = (date?: Date) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setScheduleDate("");
    }
    setScheduleTime("");
    setComplaint("");
    setSelectedPatientId(null);
    setPatientSearch("");
    setAddModalOpen(true);
  };

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

  const handleAddSchedule = () => {
    if (!selectedPatientId || !complaint || !scheduleDate) return;
    const timeStr = scheduleTime
      ? `${scheduleDate}T${scheduleTime}:00+08:00`
      : `${scheduleDate}T00:00:00+08:00`;
    const time = new Date(timeStr);
    const filesToUpload = [...labFiles];
    const patientId = selectedPatientId;
    addToQueue.mutate(
      {
        patientId,
        complaint,
        time,
        type: "Scheduled",
        status: "Waiting",
        weight: weight.trim() || null,
        bloodPressure: bloodPressure.trim() || null,
        pulseRate: pulseRate.trim() || null,
        temperature: temperature.trim() || null,
      } as any,
      {
        onSuccess: async (entry) => {
          resetModal();
          await uploadLabFiles(entry.id, patientId, filesToUpload);
        }
      }
    );
  };

  const dayScheduled = selectedDate ? getScheduledForDate(selectedDate) : [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Schedule</h1>
            <p className="text-slate-500 mt-1">View and manage patient appointments by date.</p>
          </div>
          <Button onClick={() => openAddModal()} className="bg-primary shadow-md shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Add Schedule
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {currentMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>Next</Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div>
                  ))}
                  {calendarDays.map((date, i) => {
                    const scheduled = date ? getScheduledForDate(date) : [];
                    const isToday = date && isSamePHDay(date, new Date());
                    const isSelected = date && selectedDate && isSamePHDay(date, selectedDate);
                    const isPast = date ? isPHBeforeToday(date) : false;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (date) {
                            setSelectedDate(date);
                          }
                        }}
                        className={`min-h-[110px] p-2 flex flex-col gap-1 transition-colors ${date ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/50 cursor-default'} ${isPast ? 'bg-slate-50/70' : 'bg-white'} ${isToday ? 'bg-blue-50/50 ring-1 ring-inset ring-primary/20' : ''} ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}`}
                      >
                        {date && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : isPast ? 'text-slate-400' : 'text-slate-900'}`}>{date.getDate()}</span>
                              {!isPast && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openAddModal(date); }}
                                  className="opacity-0 hover:opacity-100 group-hover:opacity-100 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs hover:bg-primary hover:text-white transition-all"
                                  title="Add schedule"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {scheduled.slice(0, 3).map((app: any) => (
                                <div key={app.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium truncate">
                                  {app.patient.name}
                                </div>
                              ))}
                              {scheduled.length > 3 && (
                                <div className="text-[10px] text-slate-400 font-medium pl-1">+{scheduled.length - 3} more</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Day Detail Panel */}
          <div>
            <Card className="border-slate-100 shadow-sm sticky top-4">
              <CardHeader className="border-b border-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {selectedDate ? formatPHDate(selectedDate, "date-only") : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedDate ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Click a date on the calendar to view scheduled patients.
                  </div>
                ) : isLoading ? (
                  <div className="p-8 flex justify-center"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                ) : dayScheduled.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {dayScheduled.map((entry: any) => (
                      <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                          {entry.patient.photo
                            ? <img src={entry.patient.photo} alt={entry.patient.name} className="w-full h-full object-cover" />
                            : entry.patient.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/patients/${entry.patient.id}`} className="font-semibold text-slate-900 hover:text-primary transition-colors block truncate">
                            {entry.patient.name}
                          </Link>
                          <p className="text-xs text-slate-500">{entry.complaint}</p>
                          {entry.time && (
                            <p className="text-xs text-primary font-medium mt-0.5">{formatPHTime(entry.time)}</p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                          entry.status === 'Waiting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          entry.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          entry.status === 'No-show' ? 'bg-red-50 text-red-500 border-red-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    ))}
                    {selectedDate && !isPHBeforeToday(selectedDate) && (
                      <div className="p-4">
                        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => openAddModal(selectedDate)}>
                          <Plus className="mr-2 h-4 w-4" /> Add Schedule for this Day
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                    <CalendarDays className="h-10 w-10 text-slate-200" />
                    <p className="text-sm">No patients scheduled for this day.</p>
                    {selectedDate && !isPHBeforeToday(selectedDate) && (
                      <Button variant="outline" size="sm" className="border-dashed" onClick={() => openAddModal(selectedDate)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Schedule
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Schedule Dialog */}
      <Dialog open={addModalOpen} onOpenChange={(open) => { if (!open) resetModal(); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule a Patient</DialogTitle>
            <DialogDescription>Book a patient appointment for a specific date and time.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Patient search */}
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
                  {selectedPatient.photo
                    ? <img src={selectedPatient.photo} alt={selectedPatient.name} className="w-full h-full object-cover" />
                    : selectedPatient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{selectedPatient.name}</p>
                  <p className="text-xs text-slate-500">{selectedPatient.patientId} - {selectedPatient.contact}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatientId(null)}>Change</Button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg max-h-[180px] overflow-y-auto">
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
                  <div className="p-4 text-center text-sm text-slate-400">
                    {patientSearch ? "No patients found" : "Type to search patients"}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="complaint">Reason / Chief Complaint *</Label>
              <Input id="complaint" placeholder="Brief reason for visit" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vitals (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sch-weight" className="text-xs">Weight</Label>
                  <Input id="sch-weight" placeholder="e.g. 65 kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sch-bp" className="text-xs">Blood Pressure</Label>
                  <Input id="sch-bp" placeholder="e.g. 120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sch-pr" className="text-xs">Pulse Rate</Label>
                  <Input id="sch-pr" placeholder="e.g. 72 bpm" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sch-temp" className="text-xs">Temperature</Label>
                  <Input id="sch-temp" placeholder="e.g. 36.5 °C" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
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
                <Label htmlFor="scheduleDate">Date *</Label>
                <Input id="scheduleDate" type="date" min={getPHTodayStr()} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Time (Optional)</Label>
                <Input id="scheduleTime" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
            </div>
            {scheduleDate && scheduleDate < getPHTodayStr() && (
              <p className="text-xs text-red-500 font-medium">Cannot schedule for a date that has already passed.</p>
            )}
            {!(scheduleDate && scheduleDate < getPHTodayStr()) && (
              <p className="text-xs text-slate-500">Time is in Philippine Standard Time (PST).</p>
            )}

            <div className="flex items-center gap-2 pt-1">
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
            <Button onClick={handleAddSchedule} disabled={!selectedPatientId || !complaint || !scheduleDate || (scheduleDate < getPHTodayStr()) || addToQueue.isPending || isUploadingLabs}>
              {(addToQueue.isPending || isUploadingLabs) && <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {isUploadingLabs ? "Uploading…" : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
