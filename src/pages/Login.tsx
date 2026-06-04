import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error ?? "Login failed. Please try again.");
        return;
      }

      // Store the JWT token for subsequent API calls
      sessionStorage.setItem("auth_token", result.token);
      sessionStorage.setItem("auth_user", JSON.stringify(result.user));

      navigate("/dashboard");
    } catch {
      setServerError("Unable to connect to the server. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-xl shadow-orange-600/20">
            <GraduationCap className="h-10 w-10" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">MON REFUGEE LEARNING CENTRE</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-[0.2em] font-bold">GED School LMS Portal</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-900">Sign in</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Enter your credentials to access the school portal
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
            <CardContent className="space-y-4">
              {serverError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mrlc.edu"
                  autoComplete="email"
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full h-12 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white transition-all group"
              >
                {isSubmitting ? "SIGNING IN..." : (
                  <>
                    CONTINUE TO DASHBOARD
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center mt-8 space-y-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Protected area for authorized personnel only
          </p>
          <p className="text-sm text-slate-500">
            Need help? <span className="text-orange-600 font-bold">Contact school admin</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
