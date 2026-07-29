export const LANGUAGE_QUEST_AVATARS = [
  { id: "owl", label: "Wise Owl", emoji: "🦉", colors: ["#7c3aed", "#c026d3"] },
  { id: "fox", label: "Curious Fox", emoji: "🦊", colors: ["#f97316", "#fb7185"] },
  { id: "panda", label: "Happy Panda", emoji: "🐼", colors: ["#0f172a", "#475569"] },
  { id: "tiger", label: "Brave Tiger", emoji: "🐯", colors: ["#f59e0b", "#ea580c"] },
  { id: "rabbit", label: "Quick Rabbit", emoji: "🐰", colors: ["#ec4899", "#8b5cf6"] },
  { id: "dolphin", label: "Bright Dolphin", emoji: "🐬", colors: ["#0ea5e9", "#2563eb"] },
  { id: "turtle", label: "Steady Turtle", emoji: "🐢", colors: ["#10b981", "#0f766e"] },
  { id: "parrot", label: "Chatty Parrot", emoji: "🦜", colors: ["#22c55e", "#eab308"] },
  { id: "koala", label: "Calm Koala", emoji: "🐨", colors: ["#64748b", "#8b5cf6"] },
  { id: "lion", label: "Confident Lion", emoji: "🦁", colors: ["#eab308", "#f97316"] },
  { id: "butterfly", label: "Growing Butterfly", emoji: "🦋", colors: ["#06b6d4", "#8b5cf6"] },
  { id: "rocket", label: "Word Rocket", emoji: "🚀", colors: ["#4f46e5", "#ec4899"] },
] as const;

export type LanguageQuestAvatarId = typeof LANGUAGE_QUEST_AVATARS[number]["id"];

export const DEFAULT_LANGUAGE_QUEST_AVATAR: LanguageQuestAvatarId = "owl";

export function isLanguageQuestAvatarId(value: unknown): value is LanguageQuestAvatarId {
  return typeof value === "string" && LANGUAGE_QUEST_AVATARS.some((avatar) => avatar.id === value);
}
