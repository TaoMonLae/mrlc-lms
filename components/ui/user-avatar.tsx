import { useState } from "react";
import { cn } from "@/lib/utils";

// Deterministic, colorful default avatars. When a person has no uploaded photo
// (or the photo fails to load) we render their initials on a stable, name-derived
// color so every teacher / student / admin always has a recognizable avatar.

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/25 dark:text-orange-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200",
  "bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200",
  "bg-aubergine-100 text-aubergine-700 dark:bg-aubergine-500/25 dark:text-aubergine-200",
] as const;

const ROUNDED: Record<string, string> = {
  full: "rounded-full",
  "2xl": "rounded-2xl",
  xl: "rounded-xl",
  lg: "rounded-lg",
  md: "rounded-md",
};

export function initialsOf(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColor(name?: string | null): string {
  const s = name || "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
  /** Corner rounding for the fallback + image. Defaults to a full circle. */
  rounded?: keyof typeof ROUNDED;
  /** Optional title/alt override. */
  alt?: string;
}

/**
 * Renders the uploaded photo when present, otherwise a deterministic colored
 * initials avatar. Also falls back to initials if the image fails to load.
 * Size and text size come from `className` (e.g. "h-10 w-10 text-sm").
 */
export function UserAvatar({ name, src, className, rounded = "full", alt }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const roundedClass = ROUNDED[rounded] ?? ROUNDED.full;
  const hasImage = !!src && src.trim().length > 0 && !failed;

  if (hasImage) {
    return (
      <img
        src={src as string}
        alt={alt || name || "avatar"}
        onError={() => setFailed(true)}
        className={cn(
          "shrink-0 object-cover bg-slate-100 dark:bg-surface-raised",
          roundedClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt || name || "avatar"}
      title={name || undefined}
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold uppercase leading-none select-none text-sm",
        roundedClass,
        avatarColor(name),
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}

export default UserAvatar;
