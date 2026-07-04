import React from 'react';
import ProfileCard from '@/components/ProfileCard';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';
import { initialsAvatarDataUri } from '@/src/lib/avatarFallback';

interface HoloProfileHeaderProps {
  name: string;
  /** Shown as the card's subtitle — e.g. class name, subject, or job title. */
  title: string;
  /** Shown as the card's "@handle" — e.g. student ID, staff ID, teacher code. */
  handle?: string;
  /** Shown as the small status line under the handle — e.g. "Active", "On Leave". */
  status?: string;
  photoUrl?: string | null;
  onPhotoUploaded: (url: string) => void;
  targetType: 'user' | 'student' | 'teacher';
  targetId?: string | null;
  /** Card's built-in action button. */
  contactText?: string;
  onContactClick?: () => void;
  /** Hide the "Change Photo" control for viewers who can't edit this profile. Defaults to true. */
  canEditPhoto?: boolean;
}

/**
 * Holographic tilt "trading card" header used across the person-profile
 * pages (Student, Teacher, Staff), replacing the old thin photo+name banner.
 * ProfileCard (components/ProfileCard.jsx) is purely a display + a generic
 * action button — actual photo management still goes through the existing
 * ProfilePhotoUploader (kept small, directly under the card) so upload/
 * remove logic isn't duplicated.
 */
export function HoloProfileHeader({
  name, title, handle, status, photoUrl, onPhotoUploaded, targetType, targetId,
  contactText = 'Edit Profile', onContactClick, canEditPhoto = true,
}: HoloProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 mx-auto md:mx-0 w-fit">
      <ProfileCard
        avatarUrl={photoUrl || initialsAvatarDataUri(name)}
        miniAvatarUrl={photoUrl || initialsAvatarDataUri(name)}
        name={name}
        title={title}
        handle={handle || '—'}
        status={status || ''}
        contactText={contactText}
        onContactClick={onContactClick}
      />
      {canEditPhoto && (
        <ProfilePhotoUploader
          currentUrl={photoUrl}
          fallbackText={name}
          targetType={targetType}
          targetId={targetId}
          onUploaded={onPhotoUploaded}
          imageClassName="h-9 w-9 rounded-full"
          buttonLabel="Change Photo"
          className="flex-row"
        />
      )}
    </div>
  );
}

export default HoloProfileHeader;
