export const LANGUAGE_QUEST_AVATARS = [
  { id: "owl", label: "Wise Owl", emoji: "🦉", image: "/Icons/Owl School 1.svg", colors: ["#7c3aed", "#c026d3"] },
  { id: "fox", label: "Curious Fox", emoji: "🦊", colors: ["#f97316", "#fb7185"] },
  { id: "panda", label: "Happy Panda", emoji: "🐼", image: "/Icons/optimized/Panda.png", colors: ["#0f172a", "#475569"] },
  { id: "tiger", label: "Brave Tiger", emoji: "🐯", image: "/Icons/optimized/Tiger.png", colors: ["#f59e0b", "#ea580c"] },
  { id: "rabbit", label: "Quick Rabbit", emoji: "🐰", image: "/Icons/optimized/Rabbit.png", colors: ["#ec4899", "#8b5cf6"] },
  { id: "dolphin", label: "Bright Dolphin", emoji: "🐬", colors: ["#0ea5e9", "#2563eb"] },
  { id: "turtle", label: "Steady Turtle", emoji: "🐢", colors: ["#10b981", "#0f766e"] },
  { id: "parrot", label: "Chatty Parrot", emoji: "🦜", colors: ["#22c55e", "#eab308"] },
  { id: "koala", label: "Calm Koala", emoji: "🐨", image: "/Icons/optimized/Koala.png", colors: ["#64748b", "#8b5cf6"] },
  { id: "lion", label: "Confident Lion", emoji: "🦁", image: "/Icons/optimized/Lion.png", colors: ["#eab308", "#f97316"] },
  { id: "butterfly", label: "Growing Butterfly", emoji: "🦋", colors: ["#06b6d4", "#8b5cf6"] },
  { id: "rocket", label: "Word Rocket", emoji: "🚀", colors: ["#4f46e5", "#ec4899"] },
  { id: "bear", label: "Kind Bear", emoji: "🐻", image: "/Icons/optimized/Bear.png", colors: ["#a16207", "#f59e0b"] },
  { id: "cat", label: "Clever Cat", emoji: "🐱", image: "/Icons/optimized/Cat.png", colors: ["#db2777", "#f9a8d4"] },
  { id: "chicken", label: "Cheerful Chick", emoji: "🐥", image: "/Icons/optimized/Chicken.png", colors: ["#eab308", "#f97316"] },
  { id: "cow", label: "Gentle Cow", emoji: "🐮", image: "/Icons/optimized/Cow.png", colors: ["#334155", "#94a3b8"] },
  { id: "deer", label: "Swift Deer", emoji: "🦌", image: "/Icons/optimized/Deer.png", colors: ["#92400e", "#fbbf24"] },
  { id: "dog", label: "Loyal Dog", emoji: "🐶", image: "/Icons/optimized/Dog.png", colors: ["#b45309", "#fcd34d"] },
  { id: "elephant", label: "Mighty Elephant", emoji: "🐘", image: "/Icons/optimized/Elephant.png", colors: ["#475569", "#a78bfa"] },
  { id: "giraffe", label: "Curious Giraffe", emoji: "🦒", image: "/Icons/optimized/Giraffe.png", colors: ["#ca8a04", "#fb923c"] },
  { id: "penguin", label: "Focused Penguin", emoji: "🐧", image: "/Icons/optimized/Penguin.png", colors: ["#0f172a", "#38bdf8"] },
  { id: "sheep", label: "Peaceful Sheep", emoji: "🐑", image: "/Icons/optimized/Sheep.png", colors: ["#64748b", "#e2e8f0"] },
] as const;

export type LanguageQuestAvatarId = typeof LANGUAGE_QUEST_AVATARS[number]["id"];

export const DEFAULT_LANGUAGE_QUEST_AVATAR: LanguageQuestAvatarId = "owl";

export function isLanguageQuestAvatarId(value: unknown): value is LanguageQuestAvatarId {
  return typeof value === "string" && LANGUAGE_QUEST_AVATARS.some((avatar) => avatar.id === value);
}
