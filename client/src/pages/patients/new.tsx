import { useState } from "react";
import { useLocation } from "wouter";
import { useCreatePatient } from "@/hooks/use-patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewPatient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createPatient = useCreatePatient();

  const [formData, setFormData] = useState({
    patientId: `PT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    name: "",
    birthdate: "",
    gender: "",
    contact: "",
    address: "",
    allergies: "",
    existingConditions: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate inputs
      if (!formData.name || !formData.birthdate || !formData.gender || !formData.contact || !formData.address) {
        toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
        return;
      }

      const patient = await createPatient.mutateAsync(formData);
      toast({ title: "Success", description: "Patient registered successfully." });
      setLocation(`/patients/${patient.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to register patient.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Register Patient</h1>
          <p className="text-muted-foreground mt-1">Create a new patient record in the system.</p>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="patientId" className="text-muted-foreground">System ID (Auto-generated)</Label>
              <Input id="patientId" value={formData.patientId} disabled className="bg-muted font-mono" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={formData.name} onChange={handleChange} placeholder="e.g. Juan Dela Cruz" className="h-11 rounded-xl" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">Birthdate <span className="text-destructive">*</span></Label>
              <Input id="birthdate" type="date" value={formData.birthdate} onChange={handleChange} className="h-11 rounded-xl" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))} required>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contact">Contact Number <span className="text-destructive">*</span></Label>
              <Input id="contact" value={formData.contact} onChange={handleChange} placeholder="e.g. 09123456789" className="h-11 rounded-xl" required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Complete Address <span className="text-destructive">*</span></Label>
              <Textarea id="address" value={formData.address} onChange={handleChange} placeholder="e.g. 123 Main St., Brgy..." className="min-h-[80px] rounded-xl" required />
            </div>
            
            <div className="space-y-2 md:col-span-2 border-t border-border/50 pt-6 mt-2">
              <h3 className="font-semibold text-lg mb-2">Medical Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Known Allergies</Label>
              <Textarea id="allergies" value={formData.allergies} onChange={handleChange} placeholder="None known..." className="min-h-[80px] rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="existingConditions">Existing Conditions</Label>
              <Textarea id="existingConditions" value={formData.existingConditions} onChange={handleChange} placeholder="e.g. Hypertension, Diabetes..." className="min-h-[80px] rounded-xl" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              className="px-8 h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              disabled={createPatient.isPending}
            >
              {createPatient.isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-5 w-5" /> Save Patient Record</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
