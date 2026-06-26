import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PatientsList from "@/pages/patients";
import NewPatient from "@/pages/patient-new";
import PatientProfile from "@/pages/patient-profile";
import NewConsultation from "@/pages/consultation-new";
import QueuePage from "@/pages/queue";
import SchedulePage from "@/pages/schedule";
import Reports from "@/pages/reports";
import PrintPrescription from "@/pages/print-prescription";
import MedicalCertificate from "@/pages/medical-certificate";

function ProtectedRoute({ component: Component, ...rest }: { component: any, path: string }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  if (!user) {
    // If not logged in, redirect to login
    setLocation("/login");
    return null;
  }

  // Prevent accessing landing/login if logged in handled inside those components or here:
  return <Component {...rest} />;
}

function Router() {
  const { data: user, isLoading } = useUser();
  const [location] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  // Public/Auth routes
  if (location === "/") return <Landing />;
  if (location === "/login") return <Login />;

  // Protected application routes
  return (
    <Switch>
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} path="/dashboard" /></Route>
      
      <Route path="/patients"><ProtectedRoute component={PatientsList} path="/patients" /></Route>
      <Route path="/patients/new"><ProtectedRoute component={NewPatient} path="/patients/new" /></Route>
      <Route path="/patients/:id"><ProtectedRoute component={PatientProfile} path="/patients/:id" /></Route>
      <Route path="/patients/:id/consultations/new"><ProtectedRoute component={NewConsultation} path="/patients/:id/consultations/new" /></Route>
      
      <Route path="/queue"><ProtectedRoute component={QueuePage} path="/queue" /></Route>
      <Route path="/schedule"><ProtectedRoute component={SchedulePage} path="/schedule" /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} path="/reports" /></Route>
      
      {/* Special print routes outside standard layout */}
      <Route path="/print/prescription/:id"><ProtectedRoute component={PrintPrescription} path="/print/prescription/:id" /></Route>
      <Route path="/print/medical-certificate"><ProtectedRoute component={MedicalCertificate} path="/print/medical-certificate" /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function KeepAlive() {
  useEffect(() => {
    fetch("/api/ping", { credentials: "include" }).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/ping", { credentials: "include" }).catch(() => {});
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return null;
}

function RealtimeSync() {
  const { data: user } = useUser();
  useRealtimeSync(!!user);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <KeepAlive />
        <RealtimeSync />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
