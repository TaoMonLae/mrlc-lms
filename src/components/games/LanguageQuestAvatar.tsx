import { cn } from '@/lib/utils';
import {
  DEFAULT_LANGUAGE_QUEST_AVATAR,
  LANGUAGE_QUEST_AVATARS,
} from '@/shared/languageQuestAvatars';

interface LanguageQuestAvatarProps {
  avatarId?: string | null;
  name?: string;
  className?: string;
}

export function getLanguageQuestAvatar(avatarId?: string | null) {
  return LANGUAGE_QUEST_AVATARS.find((avatar) => avatar.id === avatarId)
    ?? LANGUAGE_QUEST_AVATARS.find((avatar) => avatar.id === DEFAULT_LANGUAGE_QUEST_AVATAR)
    ?? LANGUAGE_QUEST_AVATARS[0];
}

export function LanguageQuestAvatar({
  avatarId,
  name,
  className,
}: LanguageQuestAvatarProps) {
  const avatar = getLanguageQuestAvatar(avatarId);

  return (
    <span
      role="img"
      aria-label={name ? `${name}: ${avatar.label}` : avatar.label}
      title={avatar.label}
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl text-2xl shadow-lg ring-1 ring-white/40',
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${avatar.colors[0]}, ${avatar.colors[1]})` }}
    >
      {'image' in avatar ? (
        <img
          src={avatar.image}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain p-1 drop-shadow-md"
        />
      ) : (
        <span aria-hidden="true">{avatar.emoji}</span>
      )}
    </span>
  );
}
