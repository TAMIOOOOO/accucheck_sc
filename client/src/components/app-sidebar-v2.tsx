import { Link, useLocation } from "wouter";
import {
  Users,
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  LogOut,
  CalendarDays,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useUser, useLogout } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Queue", href: "/queue", icon: ListOrdered },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const logoutMutation = useLogout();

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="p-4 flex items-center justify-start border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 px-2 py-1">
          <img src="/AccucheckLogo.png" alt="Accucheck Logo" className="h-10 w-10 rounded-xl object-cover object-top shadow-md" />
          <div>
            <h2 className="font-bold text-sm tracking-tight leading-none text-foreground">Accucheck</h2>
            <p className="text-xs text-muted-foreground">Diagnostic Clinic</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className="font-medium h-10 rounded-xl mx-2 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm transition-all"
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="flex flex-col gap-4">
          <div className="px-2 text-sm">
            <p className="text-muted-foreground">Logged in as</p>
            <p className="font-medium text-foreground truncate">{user?.username || "Staff Member"}</p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 border-border/50 shadow-sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? "Logging out..." : "Log out"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
