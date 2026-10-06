import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Subtitles } from 'lucide-react';
import { PLAYBACK_SPEEDS, VIDEO_CONTROLS_AUTO_HIDE_DELAY } from '../lib/video/constants';
import { formatNoteTimestamp } from '../lib/video/noteTimestamp';

interface VideoPlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Saved lesson duration, used only until the browser reports the real media duration. */
  duration?: number;
  onProgress?: (currentTime: number) => void;
}

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export function VideoPlayerControls({ videoRef, duration, onProgress }: VideoPlayerControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Show the controls and re-arm the auto-hide timer. Controls only hide while
  // the video is playing; a paused player always shows them.
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) setControlsVisible(false);
    }, VIDEO_CONTROLS_AUTO_HIDE_DELAY);
  }, []);

  // Detect a subtitle/caption track and reflect its current on/off state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => {
      const tracks = video.textTracks;
      setHasCaptions(tracks.length > 0);
      setCaptionsOn(tracks.length > 0 && tracks[0].mode === 'showing');
    };
    sync();
    video.textTracks.addEventListener?.('addtrack', sync);
    video.textTracks.addEventListener?.('change', sync);
    return () => {
      video.textTracks.removeEventListener?.('addtrack', sync);
      video.textTracks.removeEventListener?.('change', sync);
    };
  }, [videoRef]);

  const toggleCaptions = () => {
    const video = videoRef.current;
    if (!video || video.textTracks.length === 0) return;
    const track = video.textTracks[0];
    track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
    setCaptionsOn(track.mode === 'showing');
  };

  // Mirror the media element's state (play/pause, time, duration, volume, speed).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => { isPlayingRef.current = true; setIsPlaying(true); revealControls(); };
    const handlePause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const syncDuration = () => {
      setCurrentTime(video.currentTime);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setMediaDuration(video.duration);
      }
    };
    const syncVolume = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };
    const syncRate = () => setPlaybackSpeed(video.playbackRate);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleTimeUpdate);
    video.addEventListener('loadedmetadata', syncDuration);
    video.addEventListener('durationchange', syncDuration);
    video.addEventListener('volumechange', syncVolume);
    video.addEventListener('ratechange', syncRate);
    syncDuration();
    syncVolume();
    syncRate();
    if (!video.paused) handlePlay();

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', syncDuration);
      video.removeEventListener('durationchange', syncDuration);
      video.removeEventListener('volumechange', syncVolume);
      video.removeEventListener('ratechange', syncRate);
    };
  }, [videoRef, revealControls]);

  // Reveal the controls when the pointer moves anywhere over the player (not
  // only over the control bar) and on touch, so they can always be reached.
  useEffect(() => {
    const frame = videoRef.current?.parentElement;
    if (!frame) return;
    const onLeave = () => { if (isPlayingRef.current) setControlsVisible(false); };
    frame.addEventListener('mousemove', revealControls);
    frame.addEventListener('touchstart', revealControls, { passive: true });
    frame.addEventListener('mouseleave', onLeave);
    return () => {
      frame.removeEventListener('mousemove', revealControls);
      frame.removeEventListener('touchstart', revealControls);
      frame.removeEventListener('mouseleave', onLeave);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [videoRef, revealControls]);

  // Fullscreen is requested on the player frame (video + custom controls), so
  // keep the icon in sync with whatever element is currently fullscreen.
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  // Close the speed menu when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!showSpeedMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!speedMenuRef.current?.contains(event.target as Node)) setShowSpeedMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowSpeedMenu(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showSpeedMenu]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => { /* autoplay policy or decode error; the element reports it */ });
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !(video.muted || video.volume === 0);
    video.muted = nextMuted;
    if (!nextMuted && video.volume === 0) video.volume = 1;
    setIsMuted(nextMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    if (!Number.isFinite(newTime)) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onProgress?.(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const next = parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;
    video.volume = next;
    // Dragging the slider up must audibly unmute, not just change the icon.
    video.muted = next === 0;
    setVolume(next);
    setIsMuted(next === 0);
  };

  const setSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current as FullscreenVideo | null;
    if (!video) return;
    // Fullscreen the frame that wraps the video and these controls. Requesting
    // fullscreen on the bare <video> (which has no native controls) left users
    // with no way to pause, seek or exit.
    const frame = video.parentElement ?? video;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (typeof frame.requestFullscreen === 'function') {
        await frame.requestFullscreen();
      } else if (typeof video.webkitEnterFullscreen === 'function') {
        // iPhone Safari has no element fullscreen; use the native video player.
        video.webkitEnterFullscreen();
      } else {
        await video.requestPictureInPicture?.();
      }
    } catch {
      // Fullscreen can be refused (iframe policy, user gesture); fall back to PiP.
      video.requestPictureInPicture?.().catch(() => {});
    }
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentTime(0);
    onProgress?.(0);
  };

  // The browser's own duration beats the saved lesson duration, which can be
  // stale after a re-upload or compression.
  const effectiveDuration = mediaDuration > 0 ? mediaDuration : duration && duration > 0 ? duration : 0;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;
  const visible = controlsVisible || !isPlaying || showSpeedMenu;

  return (
    <div
      // Keyboard focus (focus-visible) keeps the bar on screen; a mouse click on
      // a button must not pin it open while the lesson plays.
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 [&:has(:focus-visible)]:pointer-events-auto [&:has(:focus-visible)]:opacity-100 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onFocus={revealControls}
    >
      {/* Progress bar */}
      <div className="group/bar relative h-1 cursor-pointer bg-white/20">
        <div
          className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
        <input
          type="range"
          min={0}
          max={effectiveDuration || 100}
          step={0.1}
          value={Math.min(currentTime, effectiveDuration || 100)}
          onChange={handleSeek}
          disabled={!effectiveDuration}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          aria-label="Seek"
          aria-valuetext={`${formatNoteTimestamp(currentTime)} of ${effectiveDuration ? formatNoteTimestamp(effectiveDuration) : 'unknown length'}`}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-3 rounded-full bg-blue-500 opacity-0 transition-opacity group-hover/bar:opacity-100 group-focus-within/bar:opacity-100"
          style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-3" role="toolbar" aria-label="Video playback controls">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="p-1 text-white transition-colors hover:text-blue-400"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        {/* Time display */}
        <div className="font-mono text-xs tabular-nums text-white">
          {formatNoteTimestamp(currentTime)} / {effectiveDuration ? formatNoteTimestamp(effectiveDuration) : '--:--'}
        </div>

        {/* Volume */}
        <div className="group/volume flex items-center gap-1" role="group" aria-label="Volume controls">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 text-white transition-colors hover:text-blue-400"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={isMuted}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {/* The slider keeps its full width inside a clipped wrapper. A range
              input that is itself shrunk still paints its thumb outside its box,
              which covered the mute button and swallowed taps on touch screens. */}
          <div className="flex w-0 items-center overflow-hidden transition-[width] duration-200 group-hover/volume:w-16 group-focus-within/volume:w-16">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="block w-16 shrink-0"
              aria-label="Volume"
              aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>

        {/* Speed control */}
        <div className="relative" ref={speedMenuRef}>
          <button
            type="button"
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors hover:text-blue-400"
            aria-label={`Playback speed: ${playbackSpeed}x`}
            aria-haspopup="true"
            aria-expanded={showSpeedMenu}
          >
            {playbackSpeed}x
          </button>
          {showSpeedMenu && (
            <div
              className="absolute bottom-full left-0 mb-2 min-w-[60px] overflow-hidden rounded-lg bg-slate-900/95 shadow-none"
              role="menu"
              aria-label="Playback speed options"
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  type="button"
                  key={speed}
                  onClick={() => setSpeed(speed)}
                  className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                    speed === playbackSpeed
                      ? 'bg-blue-600 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                  role="menuitemradio"
                  aria-checked={speed === playbackSpeed}
                  aria-label={`Set speed to ${speed}x`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Captions toggle (only when a subtitle track is present) */}
        {hasCaptions && (
          <button
            type="button"
            onClick={toggleCaptions}
            className={`rounded p-1 transition-colors ${captionsOn ? 'bg-white/10 text-blue-400' : 'text-white hover:text-blue-400'}`}
            aria-label={captionsOn ? 'Hide captions' : 'Show captions'}
            aria-pressed={captionsOn}
            title="Captions"
          >
            <Subtitles className="h-4 w-4" />
          </button>
        )}

        {/* Restart */}
        <button
          type="button"
          onClick={restart}
          className="ml-auto p-1 text-white transition-colors hover:text-blue-400"
          aria-label="Restart video"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1 text-white transition-colors hover:text-blue-400"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
