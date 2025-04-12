
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onComplete?: () => void;
  className?: string;
}

export function VideoPlayer({ videoUrl, title, onComplete, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      if (videoElement) {
        const current = videoElement.currentTime;
        setCurrentTime(current);
        setProgress((current / videoElement.duration) * 100);
        
        // Marked as completed when 95% watched
        if (current / videoElement.duration > 0.95 && onComplete) {
          onComplete();
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onComplete) {
        onComplete();
      }
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    }
    
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    
    const seekTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTime;
    setProgress(parseFloat(e.target.value));
  };

  return (
    <div className={`relative rounded-md overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}
      
      <video 
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
        preload="metadata"
      />
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity">
        {title && (
          <h3 className="text-white font-medium mb-2 text-sm md:text-base">{title}</h3>
        )}
        
        <div className="flex flex-col gap-2">
          <div className="w-full flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-1 accent-primary bg-white/30 rounded-full"
            />
            <span className="text-white text-xs">
              {formatTime(currentTime)}/{formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
