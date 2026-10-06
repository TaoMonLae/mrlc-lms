import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const forced = !!user?.mustChangePassword;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirm) { setError("New passwords do not match."); return; }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      // Full reload so /api/auth/me re-reads the cleared mustChangePassword flag.
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to change password");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-start justify-center bg-muted/50 px-4 py-8 font-sans sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-aubergine-600 text-white shadow-none shadow-none">
            <KeyRound className="h-9 w-9" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Change your password</h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">MRLC LMS</p>
          </div>
        </div>

        <Card className="bg-card text-foreground ring-border border-border shadow-none shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-foreground">
              {forced ? "Set a new password" : "Update password"}
            </CardTitle>
            <CardDescription className="font-medium leading-relaxed text-muted-foreground">
              {forced
                ? "For security, please replace the temporary password before continuing."
                : "Enter your current password and choose a new one."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit} className="mt-2">
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="current" className="text-xs font-bold uppercase tracking-wider text-foreground">Current password</Label>
                <Input id="current" type="password" autoComplete="current-password"
                  className="h-11 border-input bg-white text-foreground focus-visible:border-aubergine-600 focus-visible:ring-aubergine-600/25 dark:bg-white"
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new" className="text-xs font-bold uppercase tracking-wider text-foreground">New password</Label>
                <Input id="new" type="password" autoComplete="new-password"
                  className="h-11 border-input bg-white text-foreground focus-visible:border-aubergine-600 focus-visible:ring-aubergine-600/25 dark:bg-white"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <p className="text-xs font-medium text-muted-foreground">At least 8 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-wider text-foreground">Confirm new password</Label>
                <Input id="confirm" type="password" autoComplete="new-password"
                  className="h-11 border-input bg-white text-foreground focus-visible:border-aubergine-600 focus-visible:ring-aubergine-600/25 dark:bg-white"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button type="submit" disabled={submitting}
                className="group h-12 w-full bg-aubergine-600 text-sm font-bold text-white shadow-sm transition-all hover:bg-aubergine-700 disabled:bg-aubergine-200 disabled:text-aubergine-950 disabled:opacity-100">
                {submitting ? "Saving…" : (<>Update password <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></>)}
              </Button>
              <button type="button" onClick={logout} className="min-h-9 rounded px-3 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aubergine-600">
                Sign out instead
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
