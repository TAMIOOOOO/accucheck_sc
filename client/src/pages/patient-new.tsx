import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { useCreatePatient } from "@/hooks/use-patients";
import { api } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, UserPlus, Loader2, Camera, Upload, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useRef } from "react";

const formSchema = api.patients.create.input;

export default function NewPatient() {
  const [, setLocation] = useLocation();
  const createMutation = useCreatePatient();
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isSmoker, setIsSmoker] = useState(false);
  const [sticksPerDay, setSticksPerDay] = useState("");
  const [smokingYears, setSmokingYears] = useState("");
  const [isDrinker, setIsDrinker] = useState(false);
  const [drinkingFrequency, setDrinkingFrequency] = useState("");
  const [bottlesPerBinge, setBottlesPerBinge] = useState("");

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
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      form.setValue("photo", dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPhoto(dataUrl);
        form.setValue("photo", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: `PT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      name: "",
      birthdate: "",
      gender: "",
      contact: "",
      address: "",
      allergies: "",
      existingConditions: "",
      familyHistory: "",
      pastMedicalHistory: "",
      personalSocialHistory: "",
      photo: "",
    },
  });

  const buildPersonalSocialJson = () => {
    if (!isSmoker && !isDrinker) return null;
    return JSON.stringify({
      smoker: isSmoker,
      sticksPerDay: isSmoker ? sticksPerDay : null,
      smokingYears: isSmoker ? smokingYears : null,
      drinker: isDrinker,
      drinkingFrequency: isDrinker ? drinkingFrequency : null,
      bottlesPerBinge: isDrinker ? bottlesPerBinge : null,
    });
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const personalSocialHistory = buildPersonalSocialJson();
    createMutation.mutate({ ...data, personalSocialHistory }, {
      onSuccess: (newPatient) => {
        setLocation(`/patients/${newPatient.id}`);
      },
    });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100">
            <Link href="/patients"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Register Patient</h1>
            <p className="text-sm text-slate-500">Create a new medical record.</p>
          </div>
        </div>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="border-b border-slate-50/50 bg-slate-50/30">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Patient Information
            </CardTitle>
            <CardDescription>All fields marked with an asterisk (*) are required.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {createMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>{createMutation.error.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                  {photo ? (
                    <img src={photo} alt="Patient" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="w-12 h-12 text-slate-300" />
                  )}
                  {photo && (
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); form.setValue("photo", ""); }}
                      className="absolute top-0 right-0 p-1 bg-destructive text-white rounded-bl-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-2" /> Camera
                  </Button>
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" asChild>
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
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID *</Label>
                  <Input id="patientId" {...form.register("patientId")} className="bg-slate-50 border-slate-200 text-slate-600" readOnly />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" {...form.register("name")} placeholder="e.g. Juan Dela Cruz" className="border-slate-200 focus-visible:ring-primary/20" />
                  {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate">Birthdate *</Label>
                  <Input id="birthdate" type="date" {...form.register("birthdate")} className="border-slate-200 focus-visible:ring-primary/20" />
                  {form.formState.errors.birthdate && <p className="text-xs text-destructive">{form.formState.errors.birthdate.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Sex *</Label>
                  <Select onValueChange={(v) => form.setValue("gender", v)}>
                    <SelectTrigger className="border-slate-200 focus:ring-primary/20">
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.gender && <p className="text-xs text-destructive">{form.formState.errors.gender.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Number *</Label>
                  <Input id="contact" {...form.register("contact")} placeholder="09XX XXX XXXX" className="border-slate-200 focus-visible:ring-primary/20" />
                  {form.formState.errors.contact && <p className="text-xs text-destructive">{form.formState.errors.contact.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea id="address" {...form.register("address")} placeholder="Complete residential address" className="resize-none border-slate-200 focus-visible:ring-primary/20" />
                  {form.formState.errors.address && <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies (Optional)</Label>
                  <Textarea id="allergies" {...form.register("allergies")} placeholder="Any known allergies" className="resize-none min-h-[100px] border-slate-200 focus-visible:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="existingConditions">Existing Conditions (Optional)</Label>
                  <Textarea id="existingConditions" {...form.register("existingConditions")} placeholder="E.g. Hypertension, Diabetes" className="resize-none min-h-[100px] border-slate-200 focus-visible:ring-primary/20" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="familyHistory" className="text-sm font-semibold text-slate-700">Family History (Optional)</Label>
                  <p className="text-xs text-slate-500">Hereditary diseases, chronic illnesses in immediate family members.</p>
                  <Textarea
                    id="familyHistory"
                    {...form.register("familyHistory")}
                    placeholder="E.g. Father has hypertension, mother has diabetes"
                    className="resize-none min-h-[80px] border-slate-200 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastMedicalHistory" className="text-sm font-semibold text-slate-700">Past Medical History (Optional)</Label>
                  <p className="text-xs text-slate-500">Previous illnesses, hospitalizations, surgeries, or significant medical events.</p>
                  <Textarea
                    id="pastMedicalHistory"
                    {...form.register("pastMedicalHistory")}
                    placeholder="E.g. Appendectomy in 2015, hospitalized for pneumonia in 2020"
                    className="resize-none min-h-[80px] border-slate-200 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Personal / Social History (Optional)</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Lifestyle habits that may be relevant to health.</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSmoker}
                          onChange={(e) => setIsSmoker(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                        />
                        <span className="text-sm font-medium text-slate-700">Smoker</span>
                      </label>
                      {isSmoker && (
                        <div className="grid grid-cols-2 gap-3 ml-6">
                          <div className="space-y-1">
                            <Label htmlFor="sticksPerDay" className="text-xs text-slate-600">Sticks per day</Label>
                            <Input
                              id="sticksPerDay"
                              type="number"
                              min="0"
                              value={sticksPerDay}
                              onChange={(e) => setSticksPerDay(e.target.value)}
                              placeholder="e.g. 10"
                              className="h-9 border-slate-200 focus-visible:ring-primary/20 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="smokingYears" className="text-xs text-slate-600">Years smoking</Label>
                            <Input
                              id="smokingYears"
                              type="number"
                              min="0"
                              value={smokingYears}
                              onChange={(e) => setSmokingYears(e.target.value)}
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
                          checked={isDrinker}
                          onChange={(e) => setIsDrinker(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                        />
                        <span className="text-sm font-medium text-slate-700">Alcoholic beverage drinker</span>
                      </label>
                      {isDrinker && (
                        <div className="grid grid-cols-2 gap-3 ml-6">
                          <div className="space-y-1">
                            <Label htmlFor="drinkingFrequency" className="text-xs text-slate-600">Frequency</Label>
                            <Input
                              id="drinkingFrequency"
                              value={drinkingFrequency}
                              onChange={(e) => setDrinkingFrequency(e.target.value)}
                              placeholder="e.g. Weekends"
                              className="h-9 border-slate-200 focus-visible:ring-primary/20 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="bottlesPerBinge" className="text-xs text-slate-600">Bottles per session</Label>
                            <Input
                              id="bottlesPerBinge"
                              type="number"
                              min="0"
                              value={bottlesPerBinge}
                              onChange={(e) => setBottlesPerBinge(e.target.value)}
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" asChild className="border-slate-200">
                  <Link href="/patients">Cancel</Link>
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register Patient
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
