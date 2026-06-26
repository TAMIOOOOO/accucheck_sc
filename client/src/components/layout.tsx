import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar-v2";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  if (location.startsWith("/print/")) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AppSidebar />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center gap-4 px-6 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10">
            <SidebarTrigger className="text-slate-500 hover:text-slate-900" />
            <div className="font-medium text-sm text-slate-500 flex items-center gap-2">
              <img src="/AccucheckLogo.png" alt="Accucheck Logo" className="h-4 w-4 rounded object-cover object-top" />
              Accucheck Clinic System
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8 relative">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
