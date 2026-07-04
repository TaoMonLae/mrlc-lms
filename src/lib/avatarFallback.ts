import { initialsOf } from "@/components/ui/user-avatar";

// ProfileCard (components/ProfileCard.jsx) fills its whole card with a real
// <img>, so unlike UserAvatar it can't fall back to a plain DOM/CSS initials
// badge when there's no uploaded photo — it needs an actual image URL.
// This renders the same deterministic "initials on a name-derived color"
// idea as an inline SVG data URI instead, so every profile always has a
// usable avatarUrl with no network request and no extra asset to host.
export function initialsAvatarDataUri(name?: string | null, size = 480): string {
  const initials = initialsOf(name);
  const s = name || "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const bg = `hsl(${hue}, 45%, 30%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    `<text x="50%" y="50%" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${Math.round(size * 0.38)}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
