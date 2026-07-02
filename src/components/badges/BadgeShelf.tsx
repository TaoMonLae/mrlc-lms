import React from 'react';
import {
  Flame,
  Trophy,
  CalendarCheck,
  BookOpen,
  Target,
  GraduationCap,
  Footprints,
  Award,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';

interface StudentBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  level: number;
  currentCount?: number;
  targetCount?: number;
  earnedAt: string;
}

interface BadgesResponse {
  badges: StudentBadge[];
  currentStreak: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Flame,
  Trophy,
  CalendarCheck,
  BookOpen,
  Target,
  GraduationCap,
  Footprints,
  Award,
};

interface BadgeShelfProps {
  className?: string;
  limit?: number;
}

export function BadgeShelf({ className = '', limit = 6 }: BadgeShelfProps) {
  const [data, setData] = React.useState<BadgesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiGet<BadgesResponse>('/api/student/badges')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse flex gap-3">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.badges.length === 0) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="text-center text-sm text-slate-500">
            Earn badges by attending class and completing work!
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayBadges = data.badges.slice(0, limit);

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Streak indicator */}
          {data.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900">
              <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                {data.currentStreak} day streak
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {displayBadges.map((badge) => {
              const Icon = ICON_MAP[badge.icon] || Award;
              return (
                <div
                  key={badge.key}
                  className="relative group"
                  title={`${badge.name} (Level ${badge.level})${badge.currentCount !== undefined ? `\nProgress: ${badge.currentCount}${badge.targetCount ? `/${badge.targetCount}` : ''}` : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${badge.color} border-2 border-white dark:border-surface-indigo shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {badge.level > 1 && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-aubergine-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge.level}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {data.badges.length > limit && (
            <Badge variant="secondary" className="ml-auto">
              +{data.badges.length - limit} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BadgeShelf;
