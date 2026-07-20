import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Image as ImageIcon, Camera, Heart, MessageCircle, Send, Trash2,
  Clock, X, Loader2, Flag, Pencil, Check, ShieldAlert, GraduationCap,
  PlayCircle, Users, School, BriefcaseBusiness,
  ThumbsUp, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { apiGet, apiSend, authHeaders, qs } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { useSocial } from '../../providers/SocialProvider';
import CameraCapture from '../../components/CameraCapture';
import { useTheme } from '../../components/theme-provider';
import Lightfall from '@/components/Lightfall';

type PostType = 'POST' | 'CLASS_SNAPSHOT' | 'VIDEO_HIGHLIGHT';
type Audience = 'SCHOOL' | 'CLASS' | 'STAFF';

type Reaction = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

interface MediaAsset {
  id: string;
  url: string;
  position: number;
  width: number | null;
  height: number | null;
  mime: string | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  user: { id: string; name: string; role: string };
  mine: boolean;
  reportedByMe: boolean;
}

interface HighlightVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  status: string;
  classId: string | null;
}

interface Post {
  id: string;
  type: PostType;
  audience: Audience;
  body: string | null;
  imageUrl: string | null;
  media: MediaAsset[];
  createdAt: string;
  expiresAt: string | null;
  featuredUntil: string | null;
  author: { id: string; name: string; role: string; photo: string | null };
  classInfo: { id: string; name: string; level: string } | null;
  videoLesson: HighlightVideo | null;
  mine: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  reactionByMe: Reaction | null;
  reactionCounts: Record<string, number>;
  reportedByMe: boolean;
  comments: Comment[];
  commentsLoaded: boolean;
  commentsLoading: boolean;
  commentsNextCursor: string | null;
}

interface Report {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  reportedBy: string;
  type: 'POST' | 'COMMENT';
  postId: string | null;
  content: { body: string | null; imageUrl?: string | null; author: string };
}

interface ComposerOptions {
  classes: Array<{ id: string; name: string; level: string }>;
  videos: Array<{ id: string; title: string; thumbnailUrl: string | null; duration: number | null; classId: string | null }>;
}

const PAGE_SIZE = 20;
const POST_TABS: Array<{ type: PostType; label: string; description: string }> = [
  { type: 'POST', label: 'Latest', description: '24-hour school posts' },
  { type: 'CLASS_SNAPSHOT', label: 'Class Snapshots', description: 'Moments from class' },
  { type: 'VIDEO_HIGHLIGHT', label: 'Video Highlights', description: 'Featured lessons' },
];

const roleLabel = (role: string) => role.charAt(0) + role.slice(1).toLowerCase().replaceAll('_', ' ');
const timeLeft = (iso: string | null) => {
  if (!iso) return 'No expiry';
  const date = new Date(iso);
  return date.getTime() <= Date.now() ? 'expiring' : `${formatDistanceToNowStrict(date)} left`;
};
const normalisePost = (post: Omit<Post, 'comments' | 'commentsLoaded' | 'commentsLoading' | 'commentsNextCursor'>): Post => ({
  ...post,
  comments: [],
  commentsLoaded: false,
  commentsLoading: false,
  commentsNextCursor: null,
});
const preserveLoadedComments = (incoming: Post, previous?: Post): Post => previous?.commentsLoaded
  ? { ...incoming, comments: previous.comments, commentsLoaded: true, commentsLoading: false, commentsNextCursor: previous.commentsNextCursor }
  : incoming;

// Reaction metadata: emoji, label, accent color, and the lucide fallback icon
// (used in the picker and the summary chips under each post).
const REACTIONS: Array<{ type: Reaction; emoji: string; label: string; color: string }> = [
  { type: 'LIKE', emoji: '👍', label: 'Like', color: 'text-sky-500' },
  { type: 'LOVE', emoji: '❤️', label: 'Love', color: 'text-rose-500' },
  { type: 'HAHA', emoji: '😄', label: 'Haha', color: 'text-amber-500' },
  { type: 'WOW', emoji: '😮', label: 'Wow', color: 'text-amber-500' },
  { type: 'SAD', emoji: '😢', label: 'Sad', color: 'text-amber-500' },
  { type: 'ANGRY', emoji: '😡', label: 'Angry', color: 'text-orange-600' },
];
const REACTION_EMOJI: Record<Reaction, string> = Object.fromEntries(REACTIONS.map((r) => [r.type, r.emoji])) as Record<Reaction, string>;
const REACTION_COLOR: Record<Reaction, string> = Object.fromEntries(REACTIONS.map((r) => [r.type, r.color])) as Record<Reaction, string>;

// Posts that have already expired shouldn't linger on screen until the next
// 20s poll; drop them client-side immediately when re-rendering.
const isExpired = (post: { expiresAt: string | null }) => Boolean(post.expiresAt) && new Date(post.expiresAt!).getTime() <= Date.now();

const MAX_PHOTOS = 8;

export default function SocialSpace() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { markSeen } = useSocial();
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const canCurate = isAdmin || isTeacher;

  const [activeType, setActiveType] = useState<PostType>('POST');
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedMoreRef = useRef(false);
  // Per-post carousel index (only tracked when the post has >1 photo).
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  // Full-screen image viewer: { postId, index } | null.
  const [lightbox, setLightbox] = useState<{ postId: string; index: number } | null>(null);
  // Which post's reaction picker is open (long-press / hover trigger).
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);

  const [composerType, setComposerType] = useState<PostType>('POST');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Array<{ id: string; blob: Blob; url: string }>>([]);
  const photosRef = useRef<Array<{ id: string; blob: Blob; url: string }>>([]);
  const [camera, setCamera] = useState(false);
  const [posting, setPosting] = useState(false);
  const [audience, setAudience] = useState<Audience>('SCHOOL');
  const [classId, setClassId] = useState('');
  const [videoLessonId, setVideoLessonId] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [options, setOptions] = useState<ComposerOptions>({ classes: [], videos: [] });

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostDraft, setEditPostDraft] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  // Lightfall is expensive (full-screen WebGL). Pause it whenever the tab is
  // hidden or the feed scrolls out of view, so it stops stealing CPU/GPU.
  const [lightfallPaused, setLightfallPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const addPhotos = useCallback((files: File[]) => {
    const next = files
      .filter((file) => file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')
      .map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`, blob: file, url: URL.createObjectURL(file) }));
    if (!next.length) return;
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length;
      if (room <= 0) { toast.error(`A post can have at most ${MAX_PHOTOS} photos`); return prev; }
      const accepted = next.slice(0, room);
      if (next.length > room) toast.error(`Only ${room} more photo${room === 1 ? '' : 's'} fit (max ${MAX_PHOTOS})`);
      const merged = [...prev, ...accepted];
      photosRef.current = merged;
      return merged;
    });
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const merged = prev.filter((p) => p.id !== id);
      photosRef.current = merged;
      return merged;
    });
  }, []);

  const movePhoto = useCallback((id: string, dir: -1 | 1) => {
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const merged = [...prev];
      [merged[i], merged[j]] = [merged[j], merged[i]];
      photosRef.current = merged;
      return merged;
    });
  }, []);

  const clearPhotos = useCallback(() => {
    for (const p of photosRef.current) URL.revokeObjectURL(p.url);
    photosRef.current = [];
    setPhotos([]);
  }, []);

  useEffect(() => () => {
    for (const p of photosRef.current) URL.revokeObjectURL(p.url);
  }, []);

  const load = useCallback(async (replace = false) => {
    const requestId = ++requestRef.current;
    try {
      const data = await apiGet<{ posts: Array<Omit<Post, 'comments' | 'commentsLoaded' | 'commentsLoading' | 'commentsNextCursor'>>; nextCursor: string | null }>(
        `/api/social${qs({ type: activeType, limit: String(PAGE_SIZE) })}`
      );
      if (requestId !== requestRef.current) return;
      const incoming = data.posts.map(normalisePost).filter((p) => !isExpired(p));
      setPosts((previous) => {
        if (replace) return incoming;
        const previousById = new Map(previous.map((post) => [post.id, post]));
        const incomingIds = new Set(incoming.map((post) => post.id));
        const refreshed = incoming.map((post) => preserveLoadedComments(post, previousById.get(post.id)));
        // Drop anything that has since expired, even if it fell out of the
        // latest page (keeps the feed tidy without waiting for a poll).
        const retained = previous.filter((post) => !incomingIds.has(post.id) && !isExpired(post));
        return [...refreshed, ...retained];
      });
      if (replace || !hasLoadedMoreRef.current) setNextCursor(data.nextCursor);
      await markSeen();
    } catch (err: any) {
      if (replace) toast.error(err.message || 'Could not load Social Space');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [activeType, markSeen]);

  // Don't blank the feed on tab switch: keep showing the previous tab's posts
  // until the new ones arrive (just show a loading bar) so there's no flash.
  useEffect(() => {
    let active = true;
    setLoading(true);
    hasLoadedMoreRef.current = false;
    const start = async () => {
      try { await apiSend('/api/social/media-session', 'POST', {}); } catch { /* feed error will surface if auth is invalid */ }
      if (active) await load(true);
    };
    start();
    const timer = window.setInterval(() => { if (active) load(false); }, 20_000);
    return () => { active = false; window.clearInterval(timer); requestRef.current += 1; };
  }, [activeType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause Lightfall when the tab is hidden or the feed scrolls offscreen.
  useEffect(() => {
    const onVis = () => setLightfallPaused(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    const feed = feedRef.current;
    let io: IntersectionObserver | null = null;
    if (feed && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => setLightfallPaused(!entries[0]?.isIntersecting), { threshold: 0 });
      io.observe(feed);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      io?.disconnect();
    };
  }, []);

  // Close the reaction picker on outside click / Escape.
  useEffect(() => {
    if (!reactionPicker) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-reaction-picker]') && !target.closest('[data-reaction-trigger]')) setReactionPicker(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setReactionPicker(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [reactionPicker]);

  useEffect(() => {
    if (!canCurate) return;
    apiGet<ComposerOptions>('/api/social/composer-options').then(setOptions).catch(() => {});
  }, [canCurate]);

  useEffect(() => {
    if (composerType === 'CLASS_SNAPSHOT') {
      setAudience('CLASS');
      setRetentionDays('30');
    } else if (composerType === 'VIDEO_HIGHLIGHT') {
      setAudience(isTeacher ? 'CLASS' : 'SCHOOL');
      setRetentionDays('7');
      clearPhotos();
    } else {
      setAudience('SCHOOL');
      setRetentionDays('1');
      setVideoLessonId('');
    }
  }, [composerType, isTeacher, clearPhotos]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    const requestId = ++requestRef.current; // guard against a concurrent poll stomping results
    setLoadingMore(true);
    try {
      const data = await apiGet<{ posts: Array<Omit<Post, 'comments' | 'commentsLoaded' | 'commentsLoading' | 'commentsNextCursor'>>; nextCursor: string | null }>(
        `/api/social${qs({ type: activeType, limit: String(PAGE_SIZE), cursor: nextCursor })}`
      );
      if (requestId !== requestRef.current) return;
      setPosts((previous) => {
        const existing = new Set(previous.map((post) => post.id));
        return [...previous, ...data.posts.filter((post) => !existing.has(post.id) && !isExpired(post)).map(normalisePost)];
      });
      setNextCursor(data.nextCursor);
      hasLoadedMoreRef.current = true;
    } catch (err: any) {
      toast.error(err.message || 'Could not load more posts');
    } finally {
      if (requestId === requestRef.current) setLoadingMore(false);
    }
  }

  async function loadReports() {
    try {
      const data = await apiGet<Report[]>('/api/social/reports?status=OPEN');
      setReports(data);
      setOpenReportCount(data.length);
    } catch { /* moderation panel is non-critical to the feed */ }
  }
  useEffect(() => { if (isAdmin) loadReports(); }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickPhoto(blob: Blob) {
    addPhotos([new File([blob], 'social-camera.jpg', { type: blob.type || 'image/jpeg' })]);
    setCamera(false);
  }

  async function submit() {
    if (composerType === 'POST' && !body.trim() && photos.length === 0) { toast.error('Add a photo or some text'); return; }
    if (composerType === 'CLASS_SNAPSHOT' && photos.length === 0) { toast.error('Add a photo for the class snapshot'); return; }
    if ((composerType === 'CLASS_SNAPSHOT' || audience === 'CLASS') && !classId) { toast.error('Choose a class'); return; }
    if (composerType === 'VIDEO_HIGHLIGHT' && !videoLessonId) { toast.error('Choose a video lesson'); return; }
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('type', composerType);
      fd.append('audience', audience);
      fd.append('retentionDays', retentionDays);
      if (body.trim()) fd.append('body', body.trim());
      if (classId) fd.append('classId', classId);
      if (videoLessonId) fd.append('videoLessonId', videoLessonId);
      for (const photo of photos) fd.append('files', photo.blob, `social-image-${photo.id}.jpg`);
      const res = await fetch('/api/social', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not publish');
      setBody('');
      setClassId('');
      setVideoLessonId('');
      clearPhotos();
      toast.success(composerType === 'POST' ? 'Posted — disappears in 24 hours' : composerType === 'CLASS_SNAPSHOT' ? 'Class snapshot published' : 'Video highlight published');
      if (activeType !== composerType) setActiveType(composerType);
      else load(true);
    } catch (err: any) {
      toast.error(err.message || 'Could not publish');
    } finally {
      setPosting(false);
    }
  }

  // Apply a reaction optimistically and revert just this post on failure
  // (instead of refetching the whole feed, which used to flicker the list).
  function react(post: Post, reaction: Reaction) {
    setReactionPicker(null);
    const prevReaction = post.reactionByMe;
    const turningOff = prevReaction === reaction;
    const next = { ...post };
    if (turningOff) {
      next.likedByMe = false; next.reactionByMe = null; next.likeCount = Math.max(0, post.likeCount - 1);
      next.reactionCounts = { ...post.reactionCounts };
      const c = (next.reactionCounts[reaction] ?? 0) - 1;
      if (c <= 0) delete next.reactionCounts[reaction]; else next.reactionCounts[reaction] = c;
    } else {
      const wasReacting = post.likedByMe;
      next.likedByMe = true; next.reactionByMe = reaction;
      next.likeCount = wasReacting ? post.likeCount : post.likeCount + 1;
      next.reactionCounts = { ...post.reactionCounts };
      if (prevReaction) {
        const c = (next.reactionCounts[prevReaction] ?? 0) - 1;
        if (c <= 0) delete next.reactionCounts[prevReaction]; else next.reactionCounts[prevReaction] = c;
      }
      next.reactionCounts[reaction] = (next.reactionCounts[reaction] ?? 0) + 1;
    }
    setPosts((previous) => previous.map((item) => item.id === post.id ? next : item));
    apiSend<{ liked: boolean; reaction: Reaction | null }>(`/api/social/${post.id}/like`, 'POST', { reaction })
      .catch(() => {
        // Revert to the pre-click state for this post only.
        setPosts((previous) => previous.map((item) => item.id === post.id ? post : item));
        toast.error('Could not update reaction');
      });
  }

  async function fetchComments(postId: string, cursor?: string, append = false) {
    setPosts((previous) => previous.map((post) => post.id === postId ? { ...post, commentsLoading: true } : post));
    try {
      const data = await apiGet<{ comments: Comment[]; nextCursor: string | null }>(
        `/api/social/${postId}/comments${qs({ limit: '20', cursor })}`
      );
      setPosts((previous) => previous.map((post) => post.id === postId ? {
        ...post,
        comments: append ? [...post.comments, ...data.comments.filter((comment) => !post.comments.some((existing) => existing.id === comment.id))] : data.comments,
        commentsLoaded: true,
        commentsLoading: false,
        commentsNextCursor: data.nextCursor,
      } : post));
    } catch (err: any) {
      setPosts((previous) => previous.map((post) => post.id === postId ? { ...post, commentsLoading: false } : post));
      toast.error(err.message || 'Could not load comments');
    }
  }

  function toggleComments(post: Post) {
    const opening = !openComments[post.id];
    setOpenComments((current) => ({ ...current, [post.id]: opening }));
    if (opening && !post.commentsLoaded) fetchComments(post.id);
  }

  async function addComment(post: Post) {
    const text = (commentDraft[post.id] || '').trim();
    if (!text || commentBusy[post.id]) return;
    setCommentBusy((current) => ({ ...current, [post.id]: true }));
    try {
      const comment = await apiSend<Comment>(`/api/social/${post.id}/comments`, 'POST', { body: text });
      setCommentDraft((current) => ({ ...current, [post.id]: '' }));
      setPosts((previous) => previous.map((item) => item.id === post.id
        ? { ...item, comments: [...item.comments, { ...comment, editedAt: null, reportedByMe: false }], commentsLoaded: true, commentCount: item.commentCount + 1 }
        : item));
    } catch (err: any) {
      toast.error(err.message || 'Could not comment');
    } finally {
      setCommentBusy((current) => ({ ...current, [post.id]: false }));
    }
  }

  function startEditComment(comment: Comment) { setEditingComment(comment.id); setEditDraft(comment.body); }

  async function saveEditComment(postId: string, commentId: string) {
    const text = editDraft.trim();
    if (!text) { toast.error('Comment cannot be empty'); return; }
    try {
      const updated = await apiSend<Comment>(`/api/social/comments/${commentId}`, 'PUT', { body: text });
      setPosts((previous) => previous.map((post) => post.id === postId
        ? { ...post, comments: post.comments.map((comment) => comment.id === commentId ? { ...comment, body: updated.body, editedAt: updated.editedAt } : comment) }
        : post));
      setEditingComment(null);
    } catch (err: any) { toast.error(err.message || 'Could not save edit'); }
  }

  async function removePost(id: string) {
    if (!window.confirm('Delete this post?')) return;
    try {
      await apiSend(`/api/social/${id}`, 'DELETE');
      setPosts((previous) => previous.filter((post) => post.id !== id));
    } catch (err: any) { toast.error(err.message || 'Could not delete'); }
  }

  function startEditPost(post: Post) {
    setEditingPost(post.id);
    setEditPostDraft(post.body || '');
  }

  async function saveEditPost(post: Post) {
    const body = editPostDraft.trim();
    if (post.type === 'POST' && !body && !post.imageUrl && post.media.length === 0) { toast.error('Post cannot be empty'); return; }
    try {
      const updated = await apiSend<{ body: string | null }>(`/api/social/${post.id}`, 'PUT', { body });
      setPosts((previous) => previous.map((item) => item.id === post.id ? { ...item, body: updated.body } : item));
      setEditingPost(null);
      toast.success('Post updated');
    } catch (err: any) { toast.error(err.message || 'Could not update post'); }
  }

  async function removeComment(postId: string, commentId: string) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await apiSend(`/api/social/comments/${commentId}`, 'DELETE');
      setPosts((previous) => previous.map((post) => post.id === postId
        ? { ...post, comments: post.comments.filter((comment) => comment.id !== commentId), commentCount: Math.max(0, post.commentCount - 1) }
        : post));
    } catch (err: any) { toast.error(err.message || 'Could not delete'); }
  }

  async function reportPost(post: Post) {
    if (post.reportedByMe || !window.confirm('Report this post to the admin team?')) return;
    try {
      await apiSend(`/api/social/${post.id}/report`, 'POST', {});
      setPosts((previous) => previous.map((item) => item.id === post.id ? { ...item, reportedByMe: true } : item));
      toast.success('Reported. An admin will review it.');
    } catch (err: any) { toast.error(err.message || 'Could not report'); }
  }

  async function reportComment(postId: string, comment: Comment) {
    if (comment.reportedByMe || !window.confirm('Report this comment to the admin team?')) return;
    try {
      await apiSend(`/api/social/comments/${comment.id}/report`, 'POST', {});
      setPosts((previous) => previous.map((post) => post.id === postId
        ? { ...post, comments: post.comments.map((item) => item.id === comment.id ? { ...item, reportedByMe: true } : item) }
        : post));
      toast.success('Reported. An admin will review it.');
    } catch (err: any) { toast.error(err.message || 'Could not report'); }
  }

  async function resolveReport(id: string, action: 'ACTIONED' | 'DISMISSED') {
    try {
      await apiSend(`/api/social/reports/${id}/resolve`, 'POST', { action });
      setReports((previous) => previous.filter((report) => report.id !== id));
      setOpenReportCount((count) => Math.max(0, count - 1));
      if (action === 'ACTIONED') load(true);
      toast.success(action === 'ACTIONED' ? 'Content removed' : 'Report dismissed');
    } catch (err: any) { toast.error(err.message || 'Could not resolve report'); }
  }

  const selectedVideo = options.videos.find((video) => video.id === videoLessonId);
  const needsClass = composerType === 'CLASS_SNAPSHOT' || audience === 'CLASS';

  return (
    <div className="relative isolate -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 sm:-m-6 lg:-m-8 dark:bg-canvas">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Lightfall
          className="h-full w-full"
          paused={lightfallPaused}
          colors={['#7a3dff', '#3b89ff', '#c084fc']}
          backgroundColor={theme === 'dark' ? '#0d0d24' : '#f1eeff'}
          speed={0.4}
          streakCount={3}
          glow={1}
          density={0.5}
          twinkle={1}
          mouseInteraction={false}
        />
      </div>

      <div ref={feedRef} className="relative z-10 mx-auto max-w-3xl space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-surface-raised/80 dark:bg-surface-indigo/70">
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-aubergine-100 p-2 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Social Space</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">School moments, class snapshots, and lessons worth watching.</p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="relative shrink-0" onClick={() => { setReportsOpen(true); loadReports(); }}>
                <ShieldAlert className="mr-1.5 h-4 w-4" /> Reports
                {openReportCount > 0 && <Badge className="ml-1.5 h-5 min-w-5 justify-center bg-red-600 px-1 text-white hover:bg-red-600">{openReportCount}</Badge>}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Social Space sections">
          {POST_TABS.map((tab) => (
            <button
              key={tab.type}
              type="button"
              role="tab"
              aria-selected={activeType === tab.type}
              onClick={() => setActiveType(tab.type)}
              className={`rounded-xl border px-2 py-3 text-center backdrop-blur-sm transition-colors ${activeType === tab.type
                ? 'border-aubergine-400 bg-white/95 text-aubergine-700 shadow-sm dark:border-aubergine-500 dark:bg-surface-indigo dark:text-aubergine-300'
                : 'border-slate-200/80 bg-white/65 text-slate-500 hover:bg-white/90 dark:border-surface-raised/80 dark:bg-surface-indigo/60 dark:text-slate-400'}`}
            >
              <span className="block text-xs font-semibold sm:text-sm">{tab.label}</span>
              <span className="mt-0.5 hidden text-[10px] opacity-70 sm:block">{tab.description}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/85 p-4 backdrop-blur-sm dark:border-surface-raised/80 dark:bg-surface-indigo/75">
          {canCurate && (
            <div className="grid grid-cols-3 gap-2">
              {POST_TABS.map((item) => (
                <Button key={item.type} type="button" size="sm" variant={composerType === item.type ? 'default' : 'outline'} onClick={() => setComposerType(item.type)}>
                  {item.type === 'POST' ? 'Quick Post' : item.type === 'CLASS_SNAPSHOT' ? 'Snapshot' : 'Highlight'}
                </Button>
              ))}
            </div>
          )}

          {composerType !== 'VIDEO_HIGHLIGHT' && (
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={composerType === 'CLASS_SNAPSHOT' ? 'What was the class learning or celebrating?' : "What's happening?"}
              className="resize-none"
            />
          )}

          {composerType === 'VIDEO_HIGHLIGHT' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Video lesson</Label>
                <Select value={videoLessonId} onValueChange={(value) => {
                  setVideoLessonId(value);
                  const video = options.videos.find((item) => item.id === value);
                  if (video?.classId) { setClassId(video.classId); setAudience('CLASS'); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Choose a published video" /></SelectTrigger>
                  <SelectContent>
                    {options.videos.map((video) => <SelectItem key={video.id} value={video.id}>{video.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={1000} placeholder="Why should students watch this?" className="resize-none" />
              {selectedVideo && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                  <PlayCircle className="h-8 w-8 shrink-0 text-aubergine-600" />
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{selectedVideo.title}</p><p className="text-xs text-slate-500">Ready to feature</p></div>
                </div>
              )}
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo, index) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
                  <img src={photo.url} alt={`Selected upload ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removePhoto(photo.id)} aria-label="Remove photo" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                  {photos.length > 1 && (
                    <div className="absolute bottom-1 left-1 flex gap-0.5">
                      <button type="button" onClick={() => movePhoto(photo.id, -1)} disabled={index === 0} aria-label="Move left" className="rounded bg-black/60 p-0.5 text-white disabled:opacity-30"><ChevronLeft className="h-3 w-3" /></button>
                      <button type="button" onClick={() => movePhoto(photo.id, 1)} disabled={index === photos.length - 1} aria-label="Move right" className="rounded bg-black/60 p-0.5 text-white disabled:opacity-30"><ChevronRight className="h-3 w-3" /></button>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[10px] text-white">{index + 1}</span>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-aubergine-400 hover:text-aubergine-500 dark:border-slate-600 dark:hover:border-aubergine-400"><Plus className="h-6 w-6" /></button>
              )}
            </div>
          )}

          {canCurate && composerType !== 'POST' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {isAdmin && composerType === 'VIDEO_HIGHLIGHT' && (
                <div className="space-y-1.5">
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={(value) => { setAudience(value as Audience); if (value !== 'CLASS') setClassId(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL">Whole school</SelectItem>
                      <SelectItem value="CLASS">One class</SelectItem>
                      <SelectItem value="STAFF">Staff only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {needsClass && (
                <div className="space-y-1.5">
                  <Label>Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                    <SelectContent>
                      {options.classes.map((klass) => <SelectItem key={klass.id} value={klass.id}>{klass.name} · {klass.level}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Keep visible</Label>
                <Select value={retentionDays} onValueChange={setRetentionDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {composerType !== 'VIDEO_HIGHLIGHT' ? (
              <div className="flex gap-1">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) addPhotos(files); event.target.value = ''; }} />
                <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}><ImageIcon className="mr-1 h-4 w-4" /> {photos.length ? `Photos (${photos.length}/${MAX_PHOTOS})` : 'Photos'}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCamera(true)} disabled={photos.length >= MAX_PHOTOS}><Camera className="mr-1 h-4 w-4" /> Camera</Button>
              </div>
            ) : <span />}
            <Button onClick={submit} disabled={posting || (composerType === 'POST' && !body.trim() && photos.length === 0)}>
              {posting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {composerType === 'POST' ? 'Post (24h)' : composerType === 'CLASS_SNAPSHOT' ? 'Publish Snapshot' : 'Feature Video'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-16 text-center text-sm text-slate-500 backdrop-blur-sm dark:border-slate-700 dark:bg-surface-indigo/50">
            {activeType === 'POST' ? 'Nothing here yet. Be the first to post!' : activeType === 'CLASS_SNAPSHOT' ? 'No class snapshots have been published yet.' : 'No video highlights right now.'}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/85 backdrop-blur-sm dark:border-surface-raised/80 dark:bg-surface-indigo/75">
                <div className="flex items-start justify-between p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-aubergine-100 text-xs font-bold text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400">
                      {post.author.photo ? <img src={post.author.photo} alt="" className="h-full w-full object-cover" /> : post.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{post.author.name} <Badge variant="outline" className="ml-1 text-[9px] uppercase dark:border-slate-600 dark:text-slate-300">{roleLabel(post.author.role)}</Badge></p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLeft(post.expiresAt)}</span>
                        {post.classInfo && <Badge variant="secondary" className="h-4 px-1.5 text-[9px]"><GraduationCap className="mr-1 h-2.5 w-2.5" />{post.classInfo.name}</Badge>}
                        {post.audience === 'SCHOOL' && post.type !== 'POST' && <span className="flex items-center gap-1"><School className="h-3 w-3" /> School</span>}
                        {post.audience === 'STAFF' && <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3" /> Staff</span>}
                        {post.audience === 'CLASS' && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Class</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {!post.mine && <Button variant="ghost" size="icon" className="h-8 w-8" disabled={post.reportedByMe} title={post.reportedByMe ? 'Already reported' : 'Report post'} onClick={() => reportPost(post)}><Flag className={`h-3.5 w-3.5 ${post.reportedByMe ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} /></Button>}
                    {(post.mine || isAdmin) && <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit post" onClick={() => startEditPost(post)}><Pencil className="h-4 w-4 text-slate-400" /></Button>}
                    {(post.mine || isAdmin) && <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete post" onClick={() => removePost(post.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button>}
                  </div>
                </div>

                {editingPost === post.id ? (
                  <div className="space-y-2 px-3 pb-3">
                    <Textarea value={editPostDraft} onChange={(event) => setEditPostDraft(event.target.value)} rows={2} maxLength={1000} className="resize-none" autoFocus />
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingPost(null)}>Cancel</Button>
                      <Button type="button" size="sm" onClick={() => saveEditPost(post)}><Check className="mr-1 h-4 w-4" />Save</Button>
                    </div>
                  </div>
                ) : post.body ? <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-slate-800 dark:text-slate-200">{post.body}</p> : null}
                {post.media.length > 0 ? (
                  <PostMedia
                    post={post}
                    index={carouselIndex[post.id] ?? 0}
                    onIndex={(i) => setCarouselIndex((prev) => ({ ...prev, [post.id]: i }))}
                    onOpen={(i) => setLightbox({ postId: post.id, index: i })}
                  />
                ) : post.imageUrl ? (
                  <button type="button" onClick={() => setLightbox({ postId: post.id, index: 0 })} className="block w-full">
                    <img src={post.imageUrl} alt={post.body || (post.type === 'CLASS_SNAPSHOT' ? 'Class snapshot' : 'Social post')} className="max-h-[32rem] w-full object-cover" loading="lazy" />
                  </button>
                ) : null}

                {post.type === 'VIDEO_HIGHLIGHT' && post.videoLesson && (
                  <Link to={`/videos/${post.videoLesson.id}`} className="group/video mx-3 mb-3 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-aubergine-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
                    <div className="relative grid h-24 w-36 shrink-0 place-items-center overflow-hidden bg-slate-200 dark:bg-slate-800">
                      {post.videoLesson.thumbnailUrl && <img src={post.videoLesson.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                      <PlayCircle className="absolute h-10 w-10 text-white drop-shadow" />
                    </div>
                    <div className="min-w-0 p-3">
                      <Badge className="mb-1 bg-aubergine-600 text-[9px] text-white">Featured lesson</Badge>
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover/video:text-aubergine-700 dark:text-white">{post.videoLesson.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Watch video lesson</p>
                    </div>
                  </Link>
                )}

                <div className="flex items-center gap-4 p-3">
                  <div className="relative">
                    <button
                      type="button"
                      data-reaction-trigger={post.id}
                      aria-label={post.likedByMe ? `Change reaction (${post.reactionByMe ?? 'LIKE'})` : 'React to post'}
                      onClick={() => (post.likedByMe ? react(post, post.reactionByMe ?? 'LIKE') : setReactionPicker((current) => current === post.id ? null : post.id))}
                      onPointerEnter={() => setReactionPicker((current) => current ?? post.id)}
                      className={`flex items-center gap-1 text-sm transition-colors ${post.likedByMe ? REACTION_COLOR[post.reactionByMe ?? 'LIKE'] : 'text-slate-500 hover:text-sky-600'}`}
                    >
                      {post.likedByMe ? <span className="text-lg leading-none">{REACTION_EMOJI[post.reactionByMe ?? 'LIKE']}</span> : <ThumbsUp className="h-5 w-5" />}
                      {post.likeCount > 0 && <span>{post.likeCount}</span>}
                    </button>
                    {reactionPicker === post.id && (
                      <div data-reaction-picker={post.id} className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-surface-raised">
                        {REACTIONS.map((r) => (
                          <button key={r.type} type="button" title={r.label} aria-label={r.label} onClick={() => react(post, r.type)} className={`rounded-full p-1 text-xl transition-transform hover:scale-125 ${post.reactionByMe === r.type ? 'ring-2 ring-offset-1 ' + r.color : ''}`}>
                            <span>{r.emoji}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => toggleComments(post)} aria-expanded={Boolean(openComments[post.id])} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                    <MessageCircle className="h-5 w-5" /> {post.commentCount > 0 && post.commentCount}
                  </button>
                  {/* Reaction summary chips (hidden when only the default Like is in play) */}
                  {Object.keys(post.reactionCounts).length > 0 && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                      {REACTIONS.filter((r) => post.reactionCounts[r.type]).map((r) => (
                        <span key={r.type} title={`${post.reactionCounts[r.type]} ${r.label}`} className="flex items-center">
                          <span className="text-sm">{r.emoji}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {openComments[post.id] && (
                  <div className="space-y-3 border-t border-slate-100 p-3 dark:border-slate-700">
                    {post.commentsLoading && post.comments.length === 0 ? (
                      <p className="flex items-center justify-center py-3 text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading comments…</p>
                    ) : post.comments.map((comment) => (
                      <div key={comment.id} className="group flex items-start justify-between gap-2 text-sm">
                        {editingComment === comment.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input value={editDraft} onChange={(event) => setEditDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveEditComment(post.id, comment.id); if (event.key === 'Escape') setEditingComment(null); }} className="h-8" autoFocus />
                            <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => saveEditComment(post.id, comment.id)}><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <>
                            <p className="min-w-0 break-words"><span className="font-medium text-slate-800 dark:text-slate-200">{comment.user.name}</span>{' '}<span className="text-slate-600 dark:text-slate-400">{comment.body}</span>{' '}{comment.editedAt && <span className="text-[10px] text-slate-400">(edited)</span>}</p>
                            <div className="flex shrink-0 items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                              {comment.mine && <button type="button" onClick={() => startEditComment(comment)} title="Edit comment" aria-label="Edit comment"><Pencil className="h-4 w-4 text-slate-400" /></button>}
                              {!comment.mine && <button type="button" onClick={() => reportComment(post.id, comment)} disabled={comment.reportedByMe} title={comment.reportedByMe ? 'Already reported' : 'Report comment'} aria-label="Report comment"><Flag className={`h-4 w-4 ${comment.reportedByMe ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} /></button>}
                              {(comment.mine || isAdmin) && <button type="button" onClick={() => removeComment(post.id, comment.id)} title="Delete comment" aria-label="Delete comment"><Trash2 className="h-4 w-4 text-slate-400" /></button>}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {post.commentsNextCursor && <Button type="button" variant="ghost" size="sm" className="w-full" disabled={post.commentsLoading} onClick={() => fetchComments(post.id, post.commentsNextCursor || undefined, true)}>{post.commentsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load more comments</Button>}
                    <div className="flex items-end gap-2 pt-1">
                      <Textarea
                        value={commentDraft[post.id] || ''}
                        onChange={(event) => setCommentDraft((current) => ({ ...current, [post.id]: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addComment(post); } }}
                        rows={1}
                        maxLength={500}
                        placeholder="Add a comment… (Enter to send, Shift+Enter for a new line)"
                        className="min-h-[2.25rem] resize-none"
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => addComment(post)} disabled={commentBusy[post.id] || !(commentDraft[post.id] || '').trim()}>{commentBusy[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
            {nextCursor && <div className="flex justify-center pt-2"><Button variant="outline" onClick={loadMore} disabled={loadingMore}>{loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load more</Button></div>}
          </div>
        )}
      </div>

      {camera && <CameraCapture onCapture={pickPhoto} onClose={() => setCamera(false)} />}

      {isAdmin && (
        <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Reported content</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {reports.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Nothing reported right now.</p> : reports.map((report) => (
                <div key={report.id} className="rounded-lg border border-slate-200 p-3 dark:border-surface-raised">
                  <p className="text-xs text-slate-400">{report.type === 'POST' ? 'Post' : 'Comment'} by {report.content.author} · reported by {report.reportedBy}</p>
                  {report.content.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{report.content.body}</p>}
                  {report.content.imageUrl && <img src={report.content.imageUrl} alt="Reported content" className="mt-2 max-h-40 rounded-md" />}
                  {report.reason && <p className="mt-1 text-xs italic text-slate-500">Reason: {report.reason}</p>}
                  <div className="mt-2 flex gap-2"><Button size="sm" variant="destructive" onClick={() => resolveReport(report.id, 'ACTIONED')}>Remove content</Button><Button size="sm" variant="outline" onClick={() => resolveReport(report.id, 'DISMISSED')}>Dismiss</Button></div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {lightbox && (() => {
        const post = posts.find((p) => p.id === lightbox.postId);
        const assets = post?.media ?? (post?.imageUrl ? [{ id: 'cover', url: post.imageUrl, position: 0, width: null, height: null, mime: null }] : []);
        if (!assets.length) return null;
        const i = Math.max(0, Math.min(lightbox.index, assets.length - 1));
        return (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
            <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
            {assets.length > 1 && (
              <>
                <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index - 1 + assets.length) % assets.length } : null); }} className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>
                <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index + 1) % assets.length } : null); }} className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">{i + 1} / {assets.length}</span>
              </>
            )}
            <img src={assets[i].url} alt="" className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        );
      })()}
    </div>
  );
}

// In-feed carousel for posts with multiple photos. Single photo renders as a
// plain (tappable) image to avoid carousel chrome for the common case.
function PostMedia({ post, index, onIndex, onOpen }: { post: Post; index: number; onIndex: (i: number) => void; onOpen: (i: number) => void; }) {
  const assets = post.media;
  if (assets.length === 1) {
    const a = assets[0];
    return (
      <button type="button" onClick={() => onOpen(0)} className="block w-full">
        <img src={a.url} alt={post.body || 'Social post'} className="max-h-[32rem] w-full object-cover" loading="lazy" />
      </button>
    );
  }
  const i = Math.max(0, Math.min(index, assets.length - 1));
  const go = (dir: -1 | 1) => onIndex((i + dir + assets.length) % assets.length);
  return (
    <div className="relative">
      <img src={assets[i].url} alt={post.body || 'Social post'} className="max-h-[32rem] w-full object-cover" loading="lazy" />
      <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"><ChevronRight className="h-5 w-5" /></button>
      <button type="button" onClick={() => onOpen(i)} className="absolute inset-0 flex items-center justify-center text-transparent hover:text-white/0" aria-label="View full size" />
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {assets.map((_, idx) => (
          <button key={idx} type="button" aria-label={`Photo ${idx + 1}`} onClick={() => onIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
        ))}
      </div>
      <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">{i + 1}/{assets.length}</span>
    </div>
  );
}
