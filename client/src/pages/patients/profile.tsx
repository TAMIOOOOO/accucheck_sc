import { useState } from "react";
import { Link, useParams } from "wouter";
import { usePatient } from "@/hooks/use-patients";
import { usePatientConsultations } from "@/hooks/use-consultations";
import { useCreateQueueEntry } from "@/hooks/use-queue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  User, Activity, FileText, Printer, Plus, Clock, AlertTriangle, ListOrdered, Calendar as CalendarIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const { data: patient, isLoading: patientLoading } = usePatient(patientId);
  const { data: consultations, isLoading: consultationsLoading } = usePatientConsultations(patientId);
  
  const addToQueue = useCreateQueueEntry();
  const { toast } = useToast();
  
  const [queueOpen, setQueueOpen] = useState(false);
  const [complaint, setComplaint] = useState("");

  if (patientLoading) return <div className="p-10 text-center animate-pulse">Loading profile...</div>;
  if (!patient) return <div className="p-10 text-center text-destructive">Patient not found</div>;

  const age = new Date().getFullYear() - new Date(patient.birthdate).getFullYear();

  const handleQueueAdd = async () => {
    try {
      await addToQueue.mutateAsync({ patientId, complaint });
      toast({ title: "Added to Queue", description: "Patient is now waiting." });
      setQueueOpen(false);
      setComplaint("");
    } catch (err) {
      toast({ title: "Error", description: "Failed to add to queue", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{patient.name}</h1>
            <p className="text-muted-foreground font-mono mt-1">ID: {patient.patientId}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary/5">
                <ListOrdered className="mr-2 h-4 w-4" /> Add to Queue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Add to Queue</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Primary Complaint / Reason for visit</Label>
                  <Input 
                    placeholder="e.g. Fever and cough for 3 days" 
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQueueOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleQueueAdd} disabled={!complaint || addToQueue.isPending} className="rounded-xl">
                  Add to Waiting List
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Link href={`/patients/${patientId}/consultations/new`}>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Activity className="mr-2 h-4 w-4" /> New Consultation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground block mb-1">Age / Gender</span>
                  <span className="font-medium">{age} yrs / {patient.gender}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Birthdate</span>
                  <span className="font-medium">{format(new Date(patient.birthdate), "MMM d, yyyy")}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Contact Number</span>
                <span className="font-medium">{patient.contact}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Address</span>
                <span className="font-medium leading-tight">{patient.address}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm rounded-2xl bg-destructive/5 border-destructive/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Medical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-destructive/80 font-semibold block mb-1">Allergies</span>
                <span className="font-medium text-foreground">{patient.allergies || "None declared"}</span>
              </div>
              <div>
                <span className="text-destructive/80 font-semibold block mb-1">Existing Conditions</span>
                <span className="font-medium text-foreground">{patient.existingConditions || "None declared"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Consultations */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 shadow-sm rounded-2xl h-full flex flex-col">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Consultation History
                </div>
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-bold">
                  {consultations?.length || 0} Records
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {consultationsLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading records...</div>
              ) : consultations?.length === 0 ? (
                <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-foreground">No consultation history</p>
                  <p className="text-sm mt-1 mb-4">Record their first visit to get started.</p>
                  <Link href={`/patients/${patientId}/consultations/new`}>
                    <Button variant="outline" size="sm" className="rounded-xl">Create First Record</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {consultations?.sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()).map((consultation) => (
                    <div key={consultation.id} className="p-6 hover:bg-muted/5 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                            <CalendarIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">
                              {format(new Date(consultation.date!), "MMMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {format(new Date(consultation.date!), "h:mm a")}
                            </div>
                          </div>
                        </div>
                        <Link href={`/print/prescription/${patientId}/${consultation.id}`} target="_blank">
                          <Button variant="outline" size="sm" className="rounded-lg shadow-sm">
                            <Printer className="mr-2 h-3.5 w-3.5" /> Print Rx
                          </Button>
                        </Link>
                      </div>

                      <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Symptoms</span>
                          <p className="text-sm">{consultation.symptoms}</p>
                        </div>
                        <div className="h-px bg-border/50 w-full" />
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Diagnosis</span>
                          <p className="text-sm font-medium text-foreground">{consultation.diagnosis}</p>
                        </div>
                        <div className="h-px bg-border/50 w-full" />
                        <div>
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-1 block flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Prescription
                          </span>
                          <p className="text-sm whitespace-pre-wrap">{consultation.prescription}</p>
                        </div>
                        {consultation.notes && (
                          <>
                            <div className="h-px bg-border/50 w-full" />
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Doctor's Notes</span>
                              <p className="text-sm italic">{consultation.notes}</p>
                            </div>
                          </>
                        )}
                        {consultation.followUpDate && (
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-semibold border border-amber-500/20">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            Follow-up: {format(new Date(consultation.followUpDate), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
