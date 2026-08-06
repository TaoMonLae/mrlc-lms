export const GAME_KEYS = [
  "SNAKE",
  "SUDOKU",
  "CHECKERS",
  "CHESS",
  "PACMAN",
  "WORD_TRAIL",
  "PERIODIC_TABLE",
] as const;

export type GameKey = (typeof GAME_KEYS)[number];
export type GamePolicyKey = GameKey | "ALL";
export type GamePolicyScope = "GLOBAL" | "CLASS" | "STUDENT";

export const GAME_LABELS: Record<GameKey, string> = {
  SNAKE: "Neon Snake",
  SUDOKU: "Sudoku",
  CHECKERS: "Checkers",
  CHESS: "Chess",
  PACMAN: "Pac-Man",
  WORD_TRAIL: "Word Trail",
  PERIODIC_TABLE: "Periodic Table",
};

export interface GameControlPolicyLike {
  id?: string;
  enabled: boolean;
  blocked: boolean;
  gameKey: string;
  dailyLimitMinutes: number | null;
  sessionLimitMinutes: number | null;
  cooldownMinutes: number;
  allowedDays: number[];
  allowedStartMinute: number | null;
  allowedEndMinute: number | null;
}

export interface GameAccessDecision {
  allowed: boolean;
  code: "ALLOWED" | "BLOCKED" | "OUTSIDE_SCHEDULE" | "DAILY_LIMIT" | "SESSION_LIMIT" | "COOLDOWN";
  reason: string | null;
  dailyLimitMinutes: number | null;
  sessionLimitMinutes: number | null;
  cooldownMinutes: number;
  dailyUsedSeconds: number;
  sessionUsedSeconds: number;
  remainingDailySeconds: number | null;
  remainingSessionSeconds: number | null;
  remainingSeconds: number | null;
  nextAllowedAt: string | null;
}

function finiteMinimum(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => Number.isFinite(value) && Number(value) > 0);
  return valid.length ? Math.min(...valid) : null;
}

function zonedParts(now: Date, timezone: string): { weekday: number; minute: number; dayKey: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    weekday: weekdays[parts.weekday] ?? now.getUTCDay(),
    minute: Number(parts.hour || 0) * 60 + Number(parts.minute || 0),
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function gameDayKey(now: Date, timezone = "UTC"): string {
  return zonedParts(now, timezone).dayKey;
}

export function policyAllowsTime(
  policy: GameControlPolicyLike,
  now: Date,
  timezone = "UTC",
): boolean {
  const hasWindow = policy.allowedStartMinute != null && policy.allowedEndMinute != null;
  if (!hasWindow && policy.allowedDays.length === 0) return true;

  const { weekday, minute } = zonedParts(now, timezone);
  const days = policy.allowedDays.length ? new Set(policy.allowedDays) : new Set([0, 1, 2, 3, 4, 5, 6]);

  if (!hasWindow) return days.has(weekday);

  const start = policy.allowedStartMinute as number;
  const end = policy.allowedEndMinute as number;
  if (start === end) return days.has(weekday);
  if (start < end) return days.has(weekday) && minute >= start && minute < end;

  // Overnight window, for example 20:00–01:00. The after-midnight portion
  // belongs to the previous day's allowed window.
  if (minute >= start) return days.has(weekday);
  const previousDay = (weekday + 6) % 7;
  return minute < end && days.has(previousDay);
}

export function applicableGamePolicies(
  policies: GameControlPolicyLike[],
  gameKey: GameKey,
): GameControlPolicyLike[] {
  return policies.filter(
    (policy) => policy.enabled && (policy.gameKey === "ALL" || policy.gameKey === gameKey),
  );
}

export function resolveGameAccess(input: {
  policies: GameControlPolicyLike[];
  gameKey: GameKey;
  now?: Date;
  timezone?: string;
  dailyUsedSeconds?: number;
  dailyUsedSecondsForAllGames?: number;
  sessionUsedSeconds?: number;
  lastSessionEndedAt?: Date | null;
  lastSessionEndedAtForAllGames?: Date | null;
}): GameAccessDecision {
  const now = input.now ?? new Date();
  const timezone = input.timezone ?? "UTC";
  const currentGameUsedSeconds = Math.max(0, Math.floor(input.dailyUsedSeconds ?? 0));
  const allGamesUsedSeconds = Math.max(
    currentGameUsedSeconds,
    Math.floor(input.dailyUsedSecondsForAllGames ?? currentGameUsedSeconds),
  );
  const sessionUsedSeconds = Math.max(0, Math.floor(input.sessionUsedSeconds ?? 0));
  const policies = applicableGamePolicies(input.policies, input.gameKey);
  const dailyOptions = policies
    .filter((policy) => policy.dailyLimitMinutes != null && policy.dailyLimitMinutes > 0)
    .map((policy) => {
      const limitMinutes = policy.dailyLimitMinutes as number;
      const usedSeconds = policy.gameKey === "ALL" ? allGamesUsedSeconds : currentGameUsedSeconds;
      return {
        limitMinutes,
        usedSeconds,
        remainingSeconds: Math.max(0, limitMinutes * 60 - usedSeconds),
      };
    })
    .sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  const activeDailyOption = dailyOptions[0] ?? null;
  const dailyLimitMinutes = activeDailyOption?.limitMinutes ?? null;
  const dailyUsedSeconds = activeDailyOption?.usedSeconds ?? currentGameUsedSeconds;
  const sessionLimitMinutes = finiteMinimum(policies.map((policy) => policy.sessionLimitMinutes));
  const cooldownMinutes = Math.max(0, ...policies.map((policy) => policy.cooldownMinutes || 0));
  const remainingDailySeconds = activeDailyOption?.remainingSeconds ?? null;
  const remainingSessionSeconds = sessionLimitMinutes == null
    ? null
    : Math.max(0, sessionLimitMinutes * 60 - sessionUsedSeconds);
  const remainingValues = [remainingDailySeconds, remainingSessionSeconds]
    .filter((value): value is number => value != null);
  const remainingSeconds = remainingValues.length ? Math.min(...remainingValues) : null;

  const base = {
    dailyLimitMinutes,
    sessionLimitMinutes,
    cooldownMinutes,
    dailyUsedSeconds,
    sessionUsedSeconds,
    remainingDailySeconds,
    remainingSessionSeconds,
    remainingSeconds,
  };

  if (policies.some((policy) => policy.blocked)) {
    return {
      ...base,
      allowed: false,
      code: "BLOCKED",
      reason: "This game has been blocked by your school.",
      nextAllowedAt: null,
    };
  }

  if (policies.some((policy) => !policyAllowsTime(policy, now, timezone))) {
    return {
      ...base,
      allowed: false,
      code: "OUTSIDE_SCHEDULE",
      reason: "This game is not available at this time.",
      nextAllowedAt: null,
    };
  }

  if (remainingDailySeconds === 0) {
    return {
      ...base,
      allowed: false,
      code: "DAILY_LIMIT",
      reason: "Your game time for today has been used.",
      nextAllowedAt: null,
    };
  }

  if (remainingSessionSeconds === 0) {
    return {
      ...base,
      allowed: false,
      code: "SESSION_LIMIT",
      reason: "This play session has reached its time limit.",
      nextAllowedAt: null,
    };
  }

  if (cooldownMinutes > 0) {
    const cooldownEnds = policies
      .filter((policy) => policy.cooldownMinutes > 0)
      .map((policy) => {
        const endedAt = policy.gameKey === "ALL"
          ? input.lastSessionEndedAtForAllGames
          : input.lastSessionEndedAt;
        return endedAt
          ? new Date(endedAt.getTime() + policy.cooldownMinutes * 60_000)
          : null;
      })
      .filter((value): value is Date => value != null)
      .sort((a, b) => b.getTime() - a.getTime());
    const nextAllowed = cooldownEnds[0] ?? null;
    if (nextAllowed && nextAllowed > now) {
      return {
        ...base,
        allowed: false,
        code: "COOLDOWN",
        reason: "Take a screen break before playing again.",
        nextAllowedAt: nextAllowed.toISOString(),
      };
    }
  }

  return {
    ...base,
    allowed: true,
    code: "ALLOWED",
    reason: null,
    nextAllowedAt: null,
  };
}

export function isGameKey(value: unknown): value is GameKey {
  return typeof value === "string" && (GAME_KEYS as readonly string[]).includes(value);
}
