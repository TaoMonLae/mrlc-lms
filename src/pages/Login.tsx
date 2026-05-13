import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
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
          <form onSubmit={handleLogin} className="mt-2">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</Label>
                <Input id="email" type="email" placeholder="admin@mrlc.edu" required className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
                  <Link to="#" className="text-xs text-orange-600 hover:underline font-bold">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all" />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-12 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white transition-all group">
                CONTINUE TO DASHBOARD
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center mt-8 space-y-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Protected area for authorized personnel only
          </p>
          <p className="text-sm text-slate-500">
            Need help? <Link to="#" className="text-orange-600 hover:underline font-bold">Contact school admin</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
