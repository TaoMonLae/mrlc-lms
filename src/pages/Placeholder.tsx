import { GraduationCap } from "lucide-react";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
        <GraduationCap className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title} Page</h1>
        <p className="text-muted-foreground mt-2">This module is currently under development.</p>
      </div>
    </div>
  );
}
