import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useUser } from "@/hooks/use-auth";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = api.auth.login.input;

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useUser();
  const loginMutation = useLogin();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (user && !isLoading) {
    return null;
  }

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    setErrorMsg("");
    loginMutation.mutate(data, {
      onError: (err) => setErrorMsg(err.message),
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to home
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <img src="/AccucheckLogo.png" alt="Accucheck Logo" className="h-10 w-10 rounded-xl object-cover object-top shadow-md" />
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Accucheck Admin</h2>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Staff Login
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your credentials to access the clinic system.
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {errorMsg && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...form.register("username")}
                  className="h-12 bg-white rounded-xl focus-visible:ring-primary/20"
                  placeholder="admin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  className="h-12 bg-white rounded-xl focus-visible:ring-primary/20"
                  placeholder="••••••••"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign in to Dashboard"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1 bg-slate-100">
        {/* login page medical background */}
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-multiply"
          src="/Landing2BG.jpg"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-l from-primary/10 via-transparent to-slate-50" />
      </div>
    </div>
  );
}
