import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/use-dashboard";
import { useQueue } from "@/hooks/use-queue";
import { formatPHDate, formatPHTime, getPHToday, isSamePHDay } from "@/lib/ph-time";
import {
  Users,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  XCircle,
  LayoutGrid
} from "lucide-react";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: queue, isLoading: queueLoading } = useQueue();
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const phToday = getPHToday();


  const walkinQueue = queue?.filter(
    (q: any) =>
      (q.status === 'Waiting' || q.status === 'In Consultation') &&
      isSamePHDay(q.time, phToday)
  ) || [];
  const scheduleQueue = queue?.filter((q: any) => q.type === 'Follow-up' || q.type === 'Scheduled') || [];
  
  // Today's appointments for the summary view (all types: Walk-in, Scheduled, Follow-up)
  const todayAppointments = useMemo(() => {
    return (queue || []).filter((q: any) => isSamePHDay(q.time, phToday));
  }, [queue, phToday]);

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const days = [];
    // Add empty slots for start of month
    for (let i = 0; i < start.getDay(); i++) {
      days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    return days;
  }, [currentMonth]);

  const getAppointmentsForDate = (date: Date) => {
    return scheduleQueue.filter((q: any) => {
      return isSamePHDay(q.time, date);
    });
  };

  const statCards = [
    { title: "Patients Today", value: stats?.patientsToday ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Waiting", value: stats?.waitingPatients ?? 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Completed", value: stats?.completedConsultations ?? 0, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "No-Show", value: stats?.noShowPatients ?? 0, icon: XCircle, color: "text-red-400", bg: "bg-red-50" },
    { title: "Total Patients", value: stats?.totalPatients ?? 0, icon: ClipboardList, color: "text-indigo-500", bg: "bg-indigo-50" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back. System Time: {formatPHDate(new Date())} (PH Time)</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="bg-white border-slate-200">
              <Link href="/queue">View Queue</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20">
              <Link href="/patients/new">
                <UserPlus className="mr-2 h-4 w-4" /> Register Patient
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-slate-100 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Column (Queue/Schedule) */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-slate-100 p-1">
                  <TabsTrigger value="queue" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <LayoutGrid className="h-4 w-4 mr-2" /> View Queue
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Calendar className="h-4 w-4 mr-2" /> View Schedule
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="queue" className="mt-0">
                <Card className="border-slate-100 shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50/50 pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" /> Current Queue
                    </CardTitle>
                    <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
                      <Link href="/queue">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {queueLoading ? (
                      <div className="p-8 flex justify-center"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                    ) : walkinQueue.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {walkinQueue.slice(0, 8).map((entry: any) => {
                          const isScheduled = entry.type === 'Scheduled' || entry.type === 'Follow-up';
                          const timeLabel = entry.time
                            ? (isScheduled ? `Scheduled for ${formatPHTime(entry.time)}` : `Since ${formatPHTime(entry.time)}`)
                            : null;
                          return (
                            <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <Link href={`/patients/${entry.patient.id}`} className="font-semibold text-slate-900 hover:text-primary transition-colors block">
                                  {entry.patient.name}
                                </Link>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <p className="text-sm text-slate-500 line-clamp-1">{entry.complaint}</p>
                                  {entry.type === 'Scheduled' && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">Scheduled</span>}
                                  {entry.type === 'Follow-up' && <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded shrink-0">Follow-up</span>}
                                  {entry.type === 'Walk-in' && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">Walk-in</span>}
                                  {timeLabel && <span className="text-[10px] text-slate-400">{timeLabel}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                  entry.status === 'Waiting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  entry.status === 'In Consultation' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>
                                  {entry.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 className="h-6 w-6 text-slate-300" />
                        </div>
                        <p>No patients in queue</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                <Card className="border-slate-100 shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50/50 pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" /> {currentMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" })}
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
                        const appointments = date ? getAppointmentsForDate(date) : [];
                        const isToday = date && isSamePHDay(date, new Date());
                        
                        return (
                          <div 
                            key={i} 
                            onClick={() => date && setSelectedDate(date)}
                            className={`min-h-[100px] p-2 bg-white flex flex-col gap-1 cursor-pointer hover:bg-slate-50 transition-colors ${!date ? 'bg-slate-50/50' : ''} ${isToday ? 'bg-blue-50/50 ring-1 ring-inset ring-primary/20' : ''}`}
                          >
                            {date && (
                              <>
                                <span className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : 'text-slate-900'}`}>{date.getDate()}</span>
                                <div className="space-y-1">
                                  {appointments.slice(0, 3).map(app => (
                                    <div key={app.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium truncate">
                                      {app.patient.name}
                                    </div>
                                  ))}
                                  {appointments.length > 3 && (
                                    <div className="text-[10px] text-slate-400 font-medium pl-1">+{appointments.length - 3} more</div>
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
              </TabsContent>
            </Tabs>
          </div>

          {/* Side Column (Today's Summary) */}
          <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {queueLoading ? (
                  <div className="p-8 flex justify-center"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                ) : todayAppointments.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {todayAppointments.map((entry: any) => (
                      <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                          <Link href={`/patients/${entry.patient.id}`} className="font-semibold text-slate-900 hover:text-primary transition-colors block">
                            {entry.patient.name}
                          </Link>
                          <p className="text-sm text-slate-500">{formatPHTime(entry.time)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${
                            entry.status === 'Waiting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            entry.status === 'In Consultation' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            entry.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            entry.status === 'No-show' ? 'bg-red-50 text-red-500 border-red-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Calendar className="h-6 w-6 text-slate-300" />
                    </div>
                    <p>No appointments today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Appointments for {selectedDate && formatPHDate(selectedDate)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedDate && getAppointmentsForDate(selectedDate).length > 0 ? (
              <div className="space-y-3">
                {getAppointmentsForDate(selectedDate).map(app => (
                  <div key={app.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex justify-between items-center">
                    <div>
                      <Link href={`/patients/${app.patient.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors">
                        {app.patient.name}
                      </Link>
                      <p className="text-sm text-slate-500">{formatPHTime(app.time)} - {app.complaint}</p>
                    </div>
                    <div className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-600">
                      {app.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No appointments scheduled for this date.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setSelectedDate(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
