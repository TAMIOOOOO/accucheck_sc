import { useState } from "react";
import { Link } from "wouter";
import { usePatients } from "@/hooks/use-patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Calendar, Phone, Activity } from "lucide-react";
import { format } from "date-fns";

export default function PatientsList() {
  const [search, setSearch] = useState("");
  // Debounce search slightly in a real app, but for now we'll just pass it
  const { data: patients, isLoading } = usePatients(search.length > 2 ? search : undefined);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Patients Database</h1>
          <p className="text-muted-foreground mt-1">Manage and search all registered patients.</p>
        </div>
        <Link href="/patients/new">
          <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <UserPlus className="mr-2 h-5 w-5" />
            Register Patient
          </Button>
        </Link>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by name, ID, or contact..." 
              className="pl-10 rounded-xl border-border/50 h-11 bg-white focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Loading patients...
            </div>
          ) : patients?.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No patients found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Patient</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Age/Gender</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {patients?.map((patient) => {
                  const age = new Date().getFullYear() - new Date(patient.birthdate).getFullYear();
                  
                  return (
                    <tr key={patient.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{patient.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">ID: {patient.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center text-muted-foreground gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> {patient.contact}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium text-xs">
                          {age} yrs • {patient.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-border shadow-sm hover:bg-primary hover:text-white">
                            View Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
