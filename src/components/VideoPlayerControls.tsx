import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Subtitles } from 'lucide-react';
import { PLAYBACK_SPEEDS, VIDEO_CONTROLS_AUTO_HIDE_DELAY } from '../lib/video/constants';

interface VideoPlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  duration?: number;
  onProgress?: (currentTime: number) => void;
}

export function VideoPlayerControls({ videoRef, duration, onProgress }: VideoPlayerControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const video = videoRef.current;

  // Detect a subtitle/caption track and reflect its current on/off state.
  useEffect(() => {
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
  }, [video]);

  const toggleCaptions = () => {
    if (!video || video.textTracks.length === 0) return;
    const track = video.textTracks[0];
    track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
    setCaptionsOn(track.mode === 'showing');
  };

  // Update play state from video element
  useEffect(() => {
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (duration) setCurrentTime(video.currentTime);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [video, duration]);

  // Auto-hide controls
  useEffect(() => {
    if (isHovering) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setIsHovering(false);
      }, VIDEO_CONTROLS_AUTO_HIDE_DELAY);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isHovering, isPlaying]);

  const togglePlay = () => {
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onProgress?.(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!video) return;
    video.volume = parseFloat(e.target.value);
    setIsMuted(video.volume === 0);
  };

  const setSpeed = (speed: number) => {
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen().catch(() => {
        // Fallback to PiP if fullscreen fails
        video.requestPictureInPicture?.();
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration && duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
        isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => isPlaying && setIsHovering(false)}
    >
      {/* Progress bar */}
      <div className="relative h-1 bg-white/20 group cursor-pointer">
        <div
          className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-3" role="toolbar" aria-label="Video playback controls">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="text-white hover:text-blue-400 transition-colors p-1"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        {/* Time display */}
        <div className="text-white text-xs font-mono" aria-live="polite" aria-atomic="true">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1 group" role="group" aria-label="Volume controls">
          <button
            onClick={toggleMute}
            className="text-white hover:text-blue-400 transition-colors p-1"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={isMuted}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            defaultValue={1}
            onChange={handleVolumeChange}
            className="w-0 group-hover:w-16 transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Speed control */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="text-white hover:text-blue-400 transition-colors text-xs font-medium px-2 py-1 bg-white/10 rounded"
            aria-label={`Playback speed: ${playbackSpeed}x`}
            aria-haspopup="true"
            aria-expanded={showSpeedMenu}
          >
            {playbackSpeed}x
          </button>
          {showSpeedMenu && (
            <div
              className="absolute bottom-full left-0 mb-2 bg-slate-900/95 rounded-lg shadow-xl overflow-hidden min-w-[60px]"
              role="menu"
              aria-label="Playback speed options"
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeed(speed)}
                  className={`block w-full px-3 py-1.5 text-xs text-left transition-colors ${
                    speed === playbackSpeed
                      ? 'bg-blue-600 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                  role="menuitem"
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
            onClick={toggleCaptions}
            className={`transition-colors p-1 rounded ${captionsOn ? 'text-blue-400 bg-white/10' : 'text-white hover:text-blue-400'}`}
            aria-label={captionsOn ? 'Hide captions' : 'Show captions'}
            aria-pressed={captionsOn}
            title="Captions"
          >
            <Subtitles className="h-4 w-4" />
          </button>
        )}

        {/* Restart */}
        <button
          onClick={() => {
            if (video) {
              video.currentTime = 0;
              setCurrentTime(0);
              onProgress?.(0);
            }
          }}
          className="text-white hover:text-blue-400 transition-colors p-1 ml-auto"
          aria-label="Restart video"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="text-white hover:text-blue-400 transition-colors p-1"
          aria-label="Toggle fullscreen"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
