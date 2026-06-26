import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary/20">
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10 max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center gap-2">
          <img
            src="/AccucheckLogo.png"
            alt="Accucheck Logo"
            className="h-10 w-10 rounded-xl object-cover object-top shadow-md"
          />
          <span className="font-bold text-xl tracking-tight text-slate-900">
            Accucheck Diagnostic Clinic
          </span>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-full bg-white/80 backdrop-blur-md border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <Link href="/login" className="flex items-center gap-2">
            Staff Login <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
                Accucheck Diagnostic Clinic
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Angelita San Gabriel-Soberano,{" "}
                <span className="text-primary font-serif italic font-medium">
                  M.D.
                </span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Caring for Our Community, One Patient at a Time.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all">
                <Clock className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">
                  Clinic Hours
                </h3>
                <p className="text-sm text-slate-500">
                  Mon - Fri: 10:00 AM - 12:00 NN
                </p>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Laboratory Hours
                </h3>
                <p className="text-sm text-slate-500">
                  Mon - Sat: 7:30 AM - 10:00 AM
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all">
                <MapPin className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">Location</h3>
                <p className="text-sm text-slate-500">
                  41 Gen. Trias St, Brgy Bagumbayan, General Trias City, Cavite
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">(046) 437-7880</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="bg-slate-100 p-2 rounded-lg text-xs font-bold px-2">
                  CP
                </div>
                <span className="text-sm font-medium">
                  09257814492 / 09437087373
                </span>
              </div>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[3rem] transform rotate-3" />
            <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-white relative overflow-hidden h-[500px]">
              {/* landing page medical abstract visual */}
              <img
                src="/AccucheckBG.jpg"
                alt="Clinic interior"
                className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent" />
              <div className="absolute bottom-6 left-6 z-10">
                <img
                  src="/AccucheckLogo.png"
                  alt="Accucheck Center"
                  className="w-36 h-auto rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
