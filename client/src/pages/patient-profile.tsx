import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { usePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useConsultations, useDeleteConsultation } from "@/hooks/use-consultations";
import { useAddToQueue, useQueue, useUpdateQueueStatus } from "@/hooks/use-queue";
import { usePatientLabResults, useDeleteLabResult, type LabResultMeta, type LabResultFull } from "@/hooks/use-lab-results";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears } from "date-fns";
import { formatPHDate, formatPHTime, formatPHDateTime, isSamePHDay, getPHToday } from "@/lib/ph-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, Calendar, MapPin, Phone, AlertTriangle, Activity, 
  Stethoscope, Plus, Printer, ArrowLeft, Loader2, Clock, Eye,
  Camera, Upload, X, Edit2, Trash2, Download, FilePen,
  FlaskConical, FileText, ExternalLink, ImageIcon, Paperclip
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { DoctorPasswordDialog } from "@/components/doctor-password-dialog";
import { generatePatientPDF } from "@/lib/pdf-export";
import { api, buildUrl } from "@shared/routes";

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1200;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
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

function LabResultsCard({ patientId }: { patientId: number }) {
  const { data: labResults, isLoading } = usePatientLabResults(patientId);
  const deleteMutation = useDeleteLabResult(patientId);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleView = async (lr: LabResultMeta) => {
    setLoadingId(lr.id);
    try {
      const res = await fetch(`/api/lab-results/${lr.id}`, { credentials: "include" });
      if (!res.ok) return;
      const full = await res.json();
      openBase64File(full.data, full.filename);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
  };

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50/50">
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" /> Lab Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
        ) : !labResults || labResults.length === 0 ? (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center">
            <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <FlaskConical className="h-7 w-7 text-slate-300" />
            </div>
            <p className="font-medium text-slate-700 text-sm">No lab results on file.</p>
            <p className="text-xs mt-1">Attach files when adding the patient to the queue.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {labResults.map((lr) => {
              const isImage = lr.mimeType.startsWith("image/");
              return (
                <div key={lr.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="shrink-0 h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    {isImage ? <ImageIcon className="h-5 w-5 text-slate-500" /> : <FileText className="h-5 w-5 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{lr.filename}</p>
                    <p className="text-xs text-slate-400">{lr.uploadedAt ? formatPHDate(new Date(lr.uploadedAt)) : "Unknown date"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs bg-white"
                      onClick={() => handleView(lr)}
                      disabled={loadingId === lr.id}
                    >
                      {loadingId === lr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                      <span className="ml-1">Open</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(lr.id)}
                      disabled={deletingId === lr.id}
                    >
                      {deletingId === lr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PatientProfile() {
  const params = useParams();
  const id = Number(params.id);
  const [, navigate] = useLocation();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const { data: consultations, isLoading: consultsLoading } = useConsultations(id);
  const { data: labResults } = usePatientLabResults(id);
  const addToQueueMutation = useAddToQueue();
  const updatePatientMutation = useUpdatePatient();
  const { data: queue } = useQueue();
  const updateStatus = useUpdateQueueStatus();

  const phToday = getPHToday();
  const todayActiveEntry = queue?.find((q: any) =>
    q.patientId === id &&
    (q.status === 'Waiting' || q.status === 'In Consultation') &&
    isSamePHDay(q.time, phToday)
  );
  
  const deleteConsultationMutation = useDeleteConsultation(id);

  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [pulseRate, setPulseRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [labFiles, setLabFiles] = useState<File[]>([]);
  const [isUploadingLabs, setIsUploadingLabs] = useState(false);
  const [labUploadWarnings, setLabUploadWarnings] = useState<string[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Edit profile state
  const [editProfilePasswordOpen, setEditProfilePasswordOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editExistingConditions, setEditExistingConditions] = useState("");
  const [editFamilyHistory, setEditFamilyHistory] = useState("");
  const [editPastMedicalHistory, setEditPastMedicalHistory] = useState("");
  const [editIsSmoker, setEditIsSmoker] = useState(false);
  const [editSticksPerDay, setEditSticksPerDay] = useState("");
  const [editSmokingYears, setEditSmokingYears] = useState("");
  const [editIsDrinker, setEditIsDrinker] = useState(false);
  const [editDrinkingFrequency, setEditDrinkingFrequency] = useState("");
  const [editBottlesPerBinge, setEditBottlesPerBinge] = useState("");
  const [editError, setEditError] = useState("");
  
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && patient) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      updatePatientMutation.mutate({ id: patient.id, photo: dataUrl });
      stopCamera();
      setPhotoModalOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && patient) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        updatePatientMutation.mutate({ id: patient.id, photo: dataUrl });
        setPhotoModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditDialog = () => {
    if (!patient) return;
    setEditName(patient.name);
    setEditBirthdate(patient.birthdate);
    setEditGender(patient.gender);
    setEditContact(patient.contact);
    setEditAddress(patient.address);
    setEditAllergies(patient.allergies ?? "");
    setEditExistingConditions(patient.existingConditions ?? "");
    setEditFamilyHistory(patient.familyHistory ?? "");
    setEditPastMedicalHistory(patient.pastMedicalHistory ?? "");
    try {
      const psh = patient.personalSocialHistory ? JSON.parse(patient.personalSocialHistory) : {};
      setEditIsSmoker(!!psh.smoker);
      setEditSticksPerDay(psh.sticksPerDay ?? "");
      setEditSmokingYears(psh.smokingYears ?? "");
      setEditIsDrinker(!!psh.drinker);
      setEditDrinkingFrequency(psh.drinkingFrequency ?? "");
      setEditBottlesPerBinge(psh.bottlesPerBinge ?? "");
    } catch {
      setEditIsSmoker(false);
      setEditSticksPerDay("");
      setEditSmokingYears("");
      setEditIsDrinker(false);
      setEditDrinkingFrequency("");
      setEditBottlesPerBinge("");
    }
    setEditError("");
    setEditProfileOpen(true);
  };

  const buildEditPersonalSocialJson = (): string | null => {
    if (!editIsSmoker && !editIsDrinker) return null;
    return JSON.stringify({
      smoker: editIsSmoker,
      sticksPerDay: editIsSmoker ? editSticksPerDay : null,
      smokingYears: editIsSmoker ? editSmokingYears : null,
      drinker: editIsDrinker,
      drinkingFrequency: editIsDrinker ? editDrinkingFrequency : null,
      bottlesPerBinge: editIsDrinker ? editBottlesPerBinge : null,
    });
  };

  const handleSaveProfile = () => {
    if (!patient) return;
    setEditError("");
    updatePatientMutation.mutate(
      {
        id: patient.id,
        name: editName,
        birthdate: editBirthdate,
        gender: editGender,
        contact: editContact,
        address: editAddress,
        allergies: editAllergies || null,
        existingConditions: editExistingConditions || null,
        familyHistory: editFamilyHistory || null,
        pastMedicalHistory: editPastMedicalHistory || null,
        personalSocialHistory: buildEditPersonalSocialJson(),
      },
      {
        onSuccess: () => setEditProfileOpen(false),
        onError: (err: unknown) => setEditError(err instanceof Error ? err.message : "Failed to save changes."),
      }
    );
  };

  if (patientLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout>
        <div className="text-center py-12">Patient not found</div>
      </AppLayout>
    );
  }

  const age = differenceInYears(new Date(), new Date(patient.birthdate));

  const resetQueueModal = () => {
    setComplaint("");
    setWeight("");
    setBloodPressure("");
    setPulseRate("");
    setTemperature("");
    setLabFiles([]);
    setLabUploadWarnings([]);
  };

  const handleAddToQueue = () => {
    addToQueueMutation.mutate({
      patientId: patient.id,
      complaint,
      type: "Walk-in",
      status: "Waiting",
      weight: weight.trim() || null,
      bloodPressure: bloodPressure.trim() || null,
      pulseRate: pulseRate.trim() || null,
      temperature: temperature.trim() || null,
    }, {
      onSuccess: async (entry) => {
        setQueueModalOpen(false);
        resetQueueModal();
        if (labFiles.length > 0) {
          setIsUploadingLabs(true);
          const MAX_BASE64_CHARS = 950_000;
          const MAX_PDF_BYTES = 700_000;
          const warnings: string[] = [];
          try {
            await Promise.all(labFiles.map(async (file) => {
              const isImage = file.type.startsWith("image/");
              if (!isImage && file.size > MAX_PDF_BYTES) {
                warnings.push(`"${file.name}" is too large (max 750 KB for PDFs) — skipped.`);
                return;
              }
              const data = isImage ? await compressImage(file) : await fileToBase64(file);
              if (data.length > MAX_BASE64_CHARS) {
                warnings.push(`"${file.name}" is still too large after processing — skipped.`);
                return;
              }
              const res = await fetch("/api/lab-results", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  patientId: patient.id,
                  queueEntryId: entry.id,
                  filename: file.name,
                  mimeType: isImage ? "image/jpeg" : file.type,
                  data,
                }),
              });
              if (!res.ok) {
                warnings.push(`"${file.name}" failed to upload — server error.`);
              }
            }));
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/lab-results`] });
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
        }
      }
    });
  };

  const handleDownloadRecord = async () => {
    if (!patient) return;
    setIsDownloading(true);
    try {
      const url = buildUrl(api.consultations.listByPatient.path, { id: patient.id });
      const res = await fetch(url, { credentials: "include" });
      const freshConsultations = res.ok ? await res.json() : [];

      const labRes = await fetch(`/api/patients/${patient.id}/lab-results`, { credentials: "include" });
      const allLabMeta: LabResultMeta[] = labRes.ok ? await labRes.json() : [];

      // For image-type lab results, fetch full data (base64) for thumbnail embedding
      const allLabFull: LabResultFull[] = await Promise.all(
        allLabMeta.map(async (lr) => {
          if (lr.mimeType.startsWith("image/")) {
            try {
              const r = await fetch(`/api/lab-results/${lr.id}`, { credentials: "include" });
              if (r.ok) return await r.json() as LabResultFull;
            } catch {
              // fall through
            }
          }
          return { ...lr, data: "" };
        })
      );

      const doc = generatePatientPDF(patient, freshConsultations, allLabFull);
      doc.save(`${patient.name}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteConsultation = () => {
    if (!deleteTarget || !deletePassword) return;
    deleteConsultationMutation.mutate({ id: deleteTarget.id, password: deletePassword }, {
      onSuccess: () => {
        setDeleteTarget(null);
        setDeletePassword("");
        setDeleteError("");
      },
      onError: (err: any) => {
        setDeleteError(err.message || "Failed to delete");
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100">
              <Link href="/patients"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{patient.name}</h1>
              <p className="text-slate-500 font-medium">ID: {patient.patientId}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100"
              onClick={() => setEditProfilePasswordOpen(true)}
            >
              <FilePen className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
              onClick={() => setQueueModalOpen(true)}
            >
              <Clock className="mr-2 h-4 w-4" /> Add to Queue
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-slate-200 text-slate-700 hover:bg-slate-100"
              onClick={() => setDownloadDialogOpen(true)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download Record</>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 sm:flex-none border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            >
              <Link
                href={`/print/medical-certificate?name=${encodeURIComponent(patient.name)}&age=${differenceInYears(new Date(), new Date(patient.birthdate))}`}
                target="_blank"
              >
                <Printer className="mr-2 h-4 w-4" /> Med. Certificate
              </Link>
            </Button>
            <Button
              className="flex-1 sm:flex-none bg-primary shadow-md shadow-primary/20"
              onClick={() => setDoctorDialogOpen(true)}
            >
              <Stethoscope className="mr-2 h-4 w-4" /> Consult
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column: Info */}
          <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-center mb-6 relative group">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
                    {patient.photo ? (
                      <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                    ) : (
                      patient.name.charAt(0)
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPhotoModalOpen(true); }}
                    className="absolute bottom-0 right-1/2 translate-x-12 p-1.5 bg-primary text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{age} years old, {patient.gender}</p>
                      <p className="text-xs text-slate-500">Born {formatPHDate(new Date(patient.birthdate))}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">{patient.contact}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">{patient.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm border-t-4 border-t-destructive/80">
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center text-destructive">
                  <AlertTriangle className="mr-2 h-4 w-4" /> Medical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Allergies</span>
                  <p className="text-slate-600">{patient.allergies || "None reported"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Existing Conditions</span>
                  <p className="text-slate-600">{patient.existingConditions || "None reported"}</p>
                </div>
              </CardContent>
            </Card>

            {(patient.familyHistory || patient.pastMedicalHistory || patient.personalSocialHistory) && (
              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm flex items-center text-slate-700">
                    <User className="mr-2 h-4 w-4" /> Patient History
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4">
                  {patient.familyHistory && (
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Family History</span>
                      <p className="text-slate-600 whitespace-pre-wrap">{patient.familyHistory}</p>
                    </div>
                  )}
                  {patient.pastMedicalHistory && (
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Past Medical History</span>
                      <p className="text-slate-600 whitespace-pre-wrap">{patient.pastMedicalHistory}</p>
                    </div>
                  )}
                  {patient.personalSocialHistory && (() => {
                    try {
                      const psh = JSON.parse(patient.personalSocialHistory);
                      const parts: string[] = [];
                      if (psh.smoker) {
                        let s = "Smoker";
                        const details: string[] = [];
                        if (psh.sticksPerDay) details.push(`${psh.sticksPerDay} sticks/day`);
                        if (psh.smokingYears) details.push(`${psh.smokingYears} years`);
                        if (details.length) s += `: ${details.join(", ")}`;
                        parts.push(s);
                      }
                      if (psh.drinker) {
                        let d = "Alcoholic drinker";
                        const details: string[] = [];
                        if (psh.drinkingFrequency) details.push(psh.drinkingFrequency);
                        if (psh.bottlesPerBinge) details.push(`${psh.bottlesPerBinge} bottles/session`);
                        if (details.length) d += `: ${details.join(", ")}`;
                        parts.push(d);
                      }
                      if (parts.length === 0) return null;
                      return (
                        <div>
                          <span className="font-semibold text-slate-700 block mb-1">Personal / Social History</span>
                          <ul className="text-slate-600 space-y-0.5">
                            {parts.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      );
                    } catch {
                      return (
                        <div>
                          <span className="font-semibold text-slate-700 block mb-1">Personal / Social History</span>
                          <p className="text-slate-600">{patient.personalSocialHistory}</p>
                        </div>
                      );
                    }
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: History + Lab Results */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-100 shadow-sm flex flex-col">
              <CardHeader className="border-b border-slate-50/50">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Consultation History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {consultsLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
                ) : consultations && consultations.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {consultations.map((consult: any) => (
                      <div key={consult.id} className="p-6 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedConsultation(consult)}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{formatPHDate(new Date(consult.date))} at {formatPHTime(new Date(consult.date))}</h3>
                            <p className="text-sm text-slate-500 font-medium">Dx: {consult.diagnosis}</p>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="bg-white hover:bg-slate-50" onClick={() => setSelectedConsultation(consult)}>
                              <Eye className="mr-2 h-4 w-4 text-slate-500" /> View
                            </Button>
                            <Button asChild size="sm" variant="outline" className="bg-white hover:bg-slate-50 shrink-0">
                              <Link href={`/print/prescription/${consult.id}?patientId=${patient.id}`} target="_blank">
                                <Printer className="mr-2 h-4 w-4 text-slate-500" /> Print Rx
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" className="bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 shrink-0" onClick={() => { setDeleteTarget(consult); setDeletePassword(""); setDeleteError(""); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4 text-sm mt-4 bg-white p-4 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Symptoms</span>
                            <p className="mt-1 text-slate-700 line-clamp-2">{consult.symptoms}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Prescription</span>
                            <div className="mt-1 text-slate-700 font-medium whitespace-pre-line line-clamp-2">
                              {(() => {
                                try {
                                  const meds = JSON.parse(consult.prescription);
                                  if (Array.isArray(meds)) return meds.map(m => `${m.name} (${m.dosage})`).join(", ");
                                } catch (e) {}
                                return consult.prescription;
                              })()}
                            </div>
                          </div>
                        </div>
                        {(consult.weight || consult.bloodPressure || consult.pulseRate || consult.temperature) && (
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                            {consult.weight && <span className="bg-slate-50 border border-slate-100 rounded px-2 py-1"><span className="font-semibold text-slate-400">Wt:</span> {consult.weight}</span>}
                            {consult.bloodPressure && <span className="bg-slate-50 border border-slate-100 rounded px-2 py-1"><span className="font-semibold text-slate-400">BP:</span> {consult.bloodPressure}</span>}
                            {consult.pulseRate && <span className="bg-slate-50 border border-slate-100 rounded px-2 py-1"><span className="font-semibold text-slate-400">PR:</span> {consult.pulseRate}</span>}
                            {consult.temperature && <span className="bg-slate-50 border border-slate-100 rounded px-2 py-1"><span className="font-semibold text-slate-400">Temp:</span> {consult.temperature}</span>}
                          </div>
                        )}
                        {consult.queueEntryId && labResults && labResults.filter((lr: LabResultMeta) => lr.queueEntryId === consult.queueEntryId).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="text-slate-400 font-semibold">Labs:</span>
                            {labResults.filter((lr: LabResultMeta) => lr.queueEntryId === consult.queueEntryId).map((lr: LabResultMeta) => (
                              <span key={lr.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 rounded px-2 py-1">
                                <Paperclip className="h-3 w-3" />{lr.filename}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Stethoscope className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-900">No previous consultations.</p>
                    <p className="text-sm mt-1">Record a new consultation to see history here.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lab Results Card */}
            <LabResultsCard patientId={patient.id} />
          </div>
        </div>
      </div>

      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Patient Photo</DialogTitle>
            <DialogDescription>
              Capture a new photo or upload an image file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={startCamera}>
                <Camera className="w-4 h-4 mr-2" /> Camera
              </Button>
              <div className="relative">
                <Button type="button" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                </Button>
              </div>
            </div>

            {showCamera && (
              <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4">
                <div className="relative max-w-lg w-full bg-white rounded-lg overflow-hidden p-4 shadow-2xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-md bg-black aspect-video object-cover" />
                  <div className="flex justify-center gap-4 mt-4">
                    <Button type="button" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); stopCamera(); }}>Cancel</Button>
                    <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); capturePhoto(); }}>Capture Photo</Button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedConsultation} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consultation Detail</DialogTitle>
            <DialogDescription>
              Recorded on {selectedConsultation && formatPHDateTime(new Date(selectedConsultation.date))}
            </DialogDescription>
          </DialogHeader>
          
          {selectedConsultation && (
            <div className="space-y-6 py-4">
              {(selectedConsultation.weight || selectedConsultation.bloodPressure || selectedConsultation.pulseRate || selectedConsultation.temperature) && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm uppercase text-slate-400">Vitals at Check-in</h4>
                  <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    {selectedConsultation.weight && (
                      <div><p className="text-xs text-slate-500 mb-0.5">Weight</p><p className="font-medium">{selectedConsultation.weight}</p></div>
                    )}
                    {selectedConsultation.bloodPressure && (
                      <div><p className="text-xs text-slate-500 mb-0.5">Blood Pressure</p><p className="font-medium">{selectedConsultation.bloodPressure}</p></div>
                    )}
                    {selectedConsultation.pulseRate && (
                      <div><p className="text-xs text-slate-500 mb-0.5">Pulse Rate</p><p className="font-medium">{selectedConsultation.pulseRate}</p></div>
                    )}
                    {selectedConsultation.temperature && (
                      <div><p className="text-xs text-slate-500 mb-0.5">Temperature</p><p className="font-medium">{selectedConsultation.temperature}</p></div>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-slate-400">Clinical Assessment</h4>
                <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500">Symptoms</Label>
                    <p className="text-slate-900 font-medium">{selectedConsultation.symptoms}</p>
                  </div>
                  {selectedConsultation.historyOfPresentIllness && (
                    <div>
                      <Label className="text-xs text-slate-500">History of Present Illness</Label>
                      <p className="text-slate-900 font-medium whitespace-pre-wrap">{selectedConsultation.historyOfPresentIllness}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500">Diagnosis</Label>
                    <p className="text-slate-900 font-bold">{selectedConsultation.diagnosis}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-primary">Treatment & Plan</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-left">
                      <tr>
                        <th className="p-2 font-bold">Medicine</th>
                        <th className="p-2 font-bold">Dosage</th>
                        <th className="p-2 font-bold">QTY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        try {
                          const meds = JSON.parse(selectedConsultation.prescription);
                          if (Array.isArray(meds)) {
                            return meds.map((med, i) => (
                              <tr key={i}>
                                <td className="p-2 font-medium">{med.name}</td>
                                <td className="p-2">{med.dosage}</td>
                                <td className="p-2">{med.qty}</td>
                              </tr>
                            ));
                          }
                        } catch (e) {}
                        return (
                          <tr>
                            <td colSpan={3} className="p-2 whitespace-pre-wrap">{selectedConsultation.prescription}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedConsultation.notes && (
                <div className="space-y-1">
                  <h4 className="font-bold text-sm uppercase text-slate-400">Internal Notes</h4>
                  <p className="text-slate-700 italic">{selectedConsultation.notes}</p>
                </div>
              )}

              {selectedConsultation.followUpDate && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <h4 className="font-bold text-xs uppercase text-amber-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Scheduled Follow-up
                  </h4>
                  <p className="text-amber-900 font-bold mt-1">
                    {formatPHDateTime(new Date(selectedConsultation.followUpDate))}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {selectedConsultation && (
              <Button asChild variant="outline">
                <Link href={`/print/prescription/${selectedConsultation.id}?patientId=${patient.id}`} target="_blank">
                  <Printer className="mr-2 h-4 w-4" /> Print Rx
                </Link>
              </Button>
            )}
            <Button onClick={() => setSelectedConsultation(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeletePassword(""); setDeleteError(""); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Consultation</DialogTitle>
            <DialogDescription>
              This will permanently remove the consultation record from{" "}
              <strong>{deleteTarget && formatPHDateTime(new Date(deleteTarget.date))}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label htmlFor="del-password">Enter your account password to confirm</Label>
            <Input
              id="del-password"
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteConsultation(); }}
            />
            {deleteError && <p className="text-sm text-red-600 font-medium">{deleteError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeletePassword(""); setDeleteError(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConsultation} disabled={!deletePassword || deleteConsultationMutation.isPending}>
              {deleteConsultationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Consultation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={queueModalOpen} onOpenChange={(open) => {
        setQueueModalOpen(open);
        if (!open) resetQueueModal();
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add to Queue</DialogTitle>
            <DialogDescription>
              Place {patient.name} in the waiting queue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="complaint">Chief Complaint *</Label>
              <Input
                id="complaint"
                placeholder="Brief reason for visit"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vitals (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pp-weight" className="text-xs">Weight</Label>
                  <Input id="pp-weight" placeholder="e.g. 65 kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pp-bp" className="text-xs">Blood Pressure</Label>
                  <Input id="pp-bp" placeholder="e.g. 120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pp-pr" className="text-xs">Pulse Rate</Label>
                  <Input id="pp-pr" placeholder="e.g. 72 bpm" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pp-temp" className="text-xs">Temperature</Label>
                  <Input id="pp-temp" placeholder="e.g. 36.5 °C" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQueueModalOpen(false); resetQueueModal(); }}>Cancel</Button>
            <Button onClick={handleAddToQueue} disabled={!complaint || addToQueueMutation.isPending}>
              {addToQueueMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DoctorPasswordDialog
        open={doctorDialogOpen}
        onOpenChange={setDoctorDialogOpen}
        onSuccess={() => {
          if (todayActiveEntry) {
            updateStatus.mutate(
              { id: todayActiveEntry.id, status: 'In Consultation' },
              { onSuccess: () => navigate(`/patients/${patient.id}/consultations/new?queueEntryId=${todayActiveEntry.id}`) }
            );
          } else {
            navigate(`/patients/${patient.id}/consultations/new`);
          }
        }}
        description="Enter the doctor password to start a consultation."
      />

      <DoctorPasswordDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        onSuccess={handleDownloadRecord}
        description="Enter the doctor password to download this patient's record."
      />

      {/* Edit Profile – doctor password gate */}
      <DoctorPasswordDialog
        open={editProfilePasswordOpen}
        onOpenChange={setEditProfilePasswordOpen}
        onSuccess={openEditDialog}
        description="Enter the doctor password to edit this patient's profile."
      />

      {/* Edit Profile – full form dialog */}
      <Dialog open={editProfileOpen} onOpenChange={(open) => { if (!open) setEditProfileOpen(false); }}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePen className="h-5 w-5 text-primary" /> Edit Patient Profile
            </DialogTitle>
            <DialogDescription>
              Update the information for <strong>{patient.name}</strong>. Patient ID cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Patient ID – read-only */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient ID</Label>
                <Input value={patient.patientId} readOnly className="bg-slate-50 text-slate-500 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-birthdate">Birthdate *</Label>
                <Input
                  id="edit-birthdate"
                  type="date"
                  value={editBirthdate}
                  onChange={(e) => setEditBirthdate(e.target.value)}
                  className="border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Sex *</Label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger id="edit-gender" className="border-slate-200 focus:ring-primary/20">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Contact Number *</Label>
                <Input
                  id="edit-contact"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-address">Address *</Label>
                <Textarea
                  id="edit-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Complete residential address"
                  className="resize-none border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Medical Alerts */}
            <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-allergies">Allergies</Label>
                <Textarea
                  id="edit-allergies"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  placeholder="Any known allergies"
                  className="resize-none min-h-[80px] border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-conditions">Existing Conditions</Label>
                <Textarea
                  id="edit-conditions"
                  value={editExistingConditions}
                  onChange={(e) => setEditExistingConditions(e.target.value)}
                  placeholder="E.g. Hypertension, Diabetes"
                  className="resize-none min-h-[80px] border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Patient History */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-family" className="font-semibold text-slate-700">Family History</Label>
                <p className="text-xs text-slate-500">Hereditary diseases, chronic illnesses in immediate family members.</p>
                <Textarea
                  id="edit-family"
                  value={editFamilyHistory}
                  onChange={(e) => setEditFamilyHistory(e.target.value)}
                  placeholder="E.g. Father has hypertension, mother has diabetes"
                  className="resize-none min-h-[70px] border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pmh" className="font-semibold text-slate-700">Past Medical History</Label>
                <p className="text-xs text-slate-500">Previous illnesses, hospitalizations, surgeries, or significant medical events.</p>
                <Textarea
                  id="edit-pmh"
                  value={editPastMedicalHistory}
                  onChange={(e) => setEditPastMedicalHistory(e.target.value)}
                  placeholder="E.g. Appendectomy in 2015"
                  className="resize-none min-h-[70px] border-slate-200 focus-visible:ring-primary/20"
                />
              </div>

              {/* Personal / Social History */}
              <div className="space-y-3">
                <div>
                  <Label className="font-semibold text-slate-700">Personal / Social History</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Lifestyle habits that may be relevant to health.</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsSmoker}
                        onChange={(e) => setEditIsSmoker(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                      />
                      <span className="text-sm font-medium text-slate-700">Smoker</span>
                    </label>
                    {editIsSmoker && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <div className="space-y-1">
                          <Label htmlFor="edit-spd" className="text-xs text-slate-600">Sticks per day</Label>
                          <Input
                            id="edit-spd"
                            type="number"
                            min="0"
                            value={editSticksPerDay}
                            onChange={(e) => setEditSticksPerDay(e.target.value)}
                            placeholder="e.g. 10"
                            className="h-9 border-slate-200 focus-visible:ring-primary/20 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-sy" className="text-xs text-slate-600">Years smoking</Label>
                          <Input
                            id="edit-sy"
                            type="number"
                            min="0"
                            value={editSmokingYears}
                            onChange={(e) => setEditSmokingYears(e.target.value)}
                            placeholder="e.g. 5"
                            className="h-9 border-slate-200 focus-visible:ring-primary/20 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsDrinker}
                        onChange={(e) => setEditIsDrinker(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                      />
                      <span className="text-sm font-medium text-slate-700">Alcoholic beverage drinker</span>
                    </label>
                    {editIsDrinker && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <div className="space-y-1">
                          <Label htmlFor="edit-df" className="text-xs text-slate-600">Frequency</Label>
                          <Input
                            id="edit-df"
                            value={editDrinkingFrequency}
                            onChange={(e) => setEditDrinkingFrequency(e.target.value)}
                            placeholder="e.g. Weekends"
                            className="h-9 border-slate-200 focus-visible:ring-primary/20 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-bpb" className="text-xs text-slate-600">Bottles per session</Label>
                          <Input
                            id="edit-bpb"
                            type="number"
                            min="0"
                            value={editBottlesPerBinge}
                            onChange={(e) => setEditBottlesPerBinge(e.target.value)}
                            placeholder="e.g. 3"
                            className="h-9 border-slate-200 focus-visible:ring-primary/20 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {editError && (
              <p className="text-sm text-destructive font-medium">{editError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditProfileOpen(false)} disabled={updatePatientMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!editName || !editBirthdate || !editGender || !editContact || !editAddress || updatePatientMutation.isPending}
              className="bg-primary shadow-md shadow-primary/20"
            >
              {updatePatientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
