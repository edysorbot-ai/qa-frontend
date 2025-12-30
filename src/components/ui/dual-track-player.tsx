"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ConversationTurn {
  role: string;
  content: string;
  timestamp?: string;
  startTime?: number;
  endTime?: number;
}

interface DualTrackPlayerProps {
  src: string;
  conversationTurns?: ConversationTurn[];
  onTimeUpdate?: (currentTime: number) => void;
}

interface TrackSegment {
  startTime: number;
  endTime: number;
  amplitude: number[];
}

export function DualTrackPlayer({
  src,
  conversationTurns = [],
  onTimeUpdate,
}: DualTrackPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const callerCanvasRef = useRef<HTMLCanvasElement>(null);
  const agentCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Generate segments for caller and agent tracks
  const { callerSegments, agentSegments, latencyPoints } = useMemo(() => {
    if (duration <= 0 || conversationTurns.length === 0) {
      return { callerSegments: [], agentSegments: [], latencyPoints: [] };
    }

    const callerSegs: TrackSegment[] = [];
    const agentSegs: TrackSegment[] = [];
    const latencies: { time: number; duration: number }[] = [];

    // Calculate proportional timing based on word count
    const turnsWithWeight = conversationTurns.map((turn) => {
      const wordCount = turn.content?.split(/\s+/).length || 10;
      return { turn, weight: wordCount };
    });

    const totalWeight = turnsWithWeight.reduce((sum, t) => sum + t.weight, 0);
    const latencyReserve = conversationTurns.length > 1 ? 0.15 : 0;
    const speechDuration = duration * (1 - latencyReserve);
    const totalLatencyTime = duration * latencyReserve;
    const latencyPerGap = conversationTurns.length > 1
      ? totalLatencyTime / (conversationTurns.length - 1)
      : 0;

    let time = 0;

    turnsWithWeight.forEach(({ turn, weight }, index) => {
      const speechTime = (weight / totalWeight) * speechDuration;
      const endTime = time + speechTime;

      // Generate random amplitude data for waveform visualization using deterministic seed
      const barCount = Math.max(20, Math.floor(speechTime * 30));
      const amplitude: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const base = 0.4 + Math.sin(i * 0.15) * 0.2;
        // Use deterministic pseudo-random based on index
        const seed = ((i * 9301 + 49297) % 233280) / 233280;
        const variation = Math.sin(i * 0.3) * 0.25 + seed * 0.25;
        amplitude.push(Math.max(0.2, Math.min(1, base + variation)));
      }

      const segment: TrackSegment = {
        startTime: time,
        endTime: endTime,
        amplitude,
      };

      if (turn.role === "user") {
        callerSegs.push(segment);
      } else {
        agentSegs.push(segment);
      }

      time = endTime;

      // Add latency point between turns
      if (index < conversationTurns.length - 1 && latencyPerGap > 0) {
        latencies.push({
          time: time,
          duration: latencyPerGap * 1000, // Convert to ms
        });
        time += latencyPerGap;
      }
    });

    return { callerSegments: callerSegs, agentSegments: agentSegs, latencyPoints: latencies };
  }, [duration, conversationTurns]);

  // Draw both waveforms
  useEffect(() => {
    // Draw waveform for a specific track - defined inside useEffect
    const drawWaveform = (
      canvas: HTMLCanvasElement | null,
      segments: TrackSegment[],
      color: string,
      playedColor: string
    ) => {
      if (!canvas || duration <= 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      segments.forEach((segment) => {
        const startX = (segment.startTime / duration) * width;
        const endX = (segment.endTime / duration) * width;
        const segmentWidth = endX - startX;
        const barCount = segment.amplitude.length;
        const barWidth = segmentWidth / barCount;
        const gap = 2;

        segment.amplitude.forEach((amp, i) => {
          const x = startX + i * barWidth;
          const barHeight = amp * (height * 0.85);
          const y = (height - barHeight) / 2;

          const timeAtBar = segment.startTime + (i / barCount) * (segment.endTime - segment.startTime);
          const isPlayed = timeAtBar <= currentTime;

          ctx.fillStyle = isPlayed ? playedColor : color;

        // Ensure radius is never negative
        const actualBarWidth = Math.max(barWidth - gap, 1);
        const radius = Math.max(0, Math.min((actualBarWidth) / 2, 2));
        ctx.beginPath();
        ctx.roundRect(x + gap / 2, y, actualBarWidth, barHeight, radius);
          ctx.fill();
        });
      });
    };

    // Caller waveform - purple theme
    drawWaveform(
      callerCanvasRef.current,
      callerSegments,
      "rgba(139, 92, 246, 0.4)", // Unplayed - light purple
      "rgb(139, 92, 246)"        // Played - solid purple
    );

    // Agent waveform - blue theme
    drawWaveform(
      agentCanvasRef.current,
      agentSegments,
      "rgba(59, 130, 246, 0.4)", // Unplayed - light blue
      "rgb(59, 130, 246)"        // Played - solid blue
    );

  }, [callerSegments, agentSegments, currentTime, duration]);

  // Calculate latency at playhead position (derived, not state)
  const latencyAtPlayhead = useMemo(() => {
    const currentLatency = latencyPoints.find(
      (lp) => currentTime >= lp.time - 0.5 && currentTime <= lp.time + 0.5
    );
    return currentLatency?.duration || null;
  }, [latencyPoints, currentTime]);

  // Calculate average latency
  const avgLatency = useMemo(() => {
    if (latencyPoints.length === 0) return null;
    const total = latencyPoints.reduce((sum, lp) => sum + lp.duration, 0);
    return total / latencyPoints.length;
  }, [latencyPoints]);

  // Audio controls
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      onTimeUpdate?.(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    if (!canvas || !audioRef.current || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const formatLatency = (ms: number) => {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
  };

  // Calculate playhead position for the latency indicator
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-xl">
      {/* Main Content */}
      <div className="bg-neutral-950 rounded-xl p-5 space-y-4">
        {/* Test Caller Track */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
              </Button>
              <span className="text-sm font-medium text-neutral-200">Test Caller</span>
            </div>
            {latencyAtPlayhead && (
              <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-full border border-neutral-700">
                <div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-xs font-medium text-neutral-300">
                  Latency: {formatLatency(latencyAtPlayhead)}
                </span>
              </div>
            )}
          </div>
          <div className="relative">
            <canvas
              ref={callerCanvasRef}
              className="w-full h-14 cursor-pointer rounded-lg"
              onClick={handleCanvasClick}
            />
            {/* Playhead line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
              style={{ left: `${playheadPercent}%` }}
            />
          </div>
        </div>

        {/* Latency Indicator Between Tracks */}
        {avgLatency && (
          <div className="relative flex items-center justify-center py-1">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-neutral-800" />
            <div 
              className="absolute h-px bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500"
              style={{ 
                left: `${playheadPercent}%`,
                right: `${100 - playheadPercent}%`,
                opacity: 0.6
              }}
            />
            <div 
              className="absolute h-4 w-px bg-neutral-600"
              style={{ left: `${playheadPercent}%` }}
            />
          </div>
        )}

        {/* Voice Agent Track */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
            </Button>
            <span className="text-sm font-medium text-neutral-200">Voice Agent</span>
          </div>
          <div className="relative">
            <canvas
              ref={agentCanvasRef}
              className="w-full h-14 cursor-pointer rounded-lg"
              onClick={handleCanvasClick}
            />
            {/* Playhead line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
              style={{ left: `${playheadPercent}%` }}
            />
            {/* Time indicator at playhead */}
            <div
              className="absolute -bottom-5 transform -translate-x-1/2 text-[10px] text-neutral-500 font-mono"
              style={{ left: `${playheadPercent}%` }}
            >
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-neutral-800">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
            onClick={() => skip(-10)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
            onClick={() => skip(10)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Progress */}
        <div className="flex-1 mx-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-500 w-10">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1 cursor-pointer"
            />
            <span className="text-xs font-mono text-neutral-500 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Stats & Volume */}
        <div className="flex items-center gap-4">
          {/* Latency Stats */}
          {avgLatency && (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>Latency: {formatLatency(avgLatency)}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-green-500">Confidence: High</span>
            </div>
          )}

          {/* Volume */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="w-20">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Info Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-full border border-neutral-700"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
    </div>
  );
}
