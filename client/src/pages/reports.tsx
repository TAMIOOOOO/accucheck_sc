import { AppLayout } from "@/components/layout";
import { useReports } from "@/hooks/use-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, AlertCircle, Loader2 } from "lucide-react";

export default function Reports() {
  const { data: reports, isLoading } = useReports();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clinic Reports</h1>
          <p className="text-slate-500 mt-1">Overview of clinic activity and health trends.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="border-b border-slate-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" /> Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Average Daily Patients</p>
                    <p className="text-4xl font-bold text-slate-900">{reports?.dailyPatientCount}</p>
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Consultations This Month</p>
                    <p className="text-4xl font-bold text-slate-900">{reports?.monthlyConsultations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="border-b border-slate-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-amber-500" /> Common Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {reports?.commonSymptoms.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4">
                      <span className="font-medium text-slate-700 capitalize">{item.symptom}</span>
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-sm font-bold">
                        {item.count} cases
                      </span>
                    </div>
                  ))}
                  {(!reports?.commonSymptoms || reports.commonSymptoms.length === 0) && (
                    <div className="p-8 text-center text-slate-500 text-sm">Not enough data to analyze yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
