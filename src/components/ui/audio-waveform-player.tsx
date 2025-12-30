"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ConversationTurn {
  role: string;
  content: string;
  timestamp?: string;
  startTime?: number;
  endTime?: number;
}

interface AudioWaveformPlayerProps {
  src: string;
  conversationTurns?: ConversationTurn[];
  onTimeUpdate?: (currentTime: number) => void;
}

interface WaveformSegment {
  role: "agent" | "user" | "silence";
  startTime: number;
  endTime: number;
  label?: string;
}

export function AudioWaveformPlayer({
  src,
  conversationTurns = [],
  onTimeUpdate,
}: AudioWaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Generate waveform data based on duration using useMemo
  const waveformData = useMemo(() => {
    if (duration <= 0) return [];
    const bars = 150;
    const data: number[] = [];
    for (let i = 0; i < bars; i++) {
      const base = 0.3 + Math.sin(i * 0.1) * 0.2;
      const variation = Math.sin(i * 0.5) * 0.3 + Math.sin(i * 0.2) * 0.2;
      const seed = (i * 7919) % 100 / 100;
      data.push(Math.max(0.15, Math.min(1, base + variation + seed * 0.2)));
    }
    return data;
  }, [duration]);

  // Generate waveform segments from conversation turns using useMemo
  const segments = useMemo((): WaveformSegment[] => {
    if (duration <= 0 || conversationTurns.length === 0) return [];
    
    const generatedSegments: WaveformSegment[] = [];
    
    // Calculate total content length to proportionally distribute time
    const turnsWithWeight = conversationTurns.map((turn) => {
      // Use word count for more accurate speech duration estimation
      const wordCount = (turn.content?.split(/\s+/).length || 10);
      return { turn, weight: wordCount };
    });
    
    const totalWeight = turnsWithWeight.reduce((sum, t) => sum + t.weight, 0);
    
    // Reserve ~15% of duration for latency gaps (between turns)
    const latencyReserve = conversationTurns.length > 1 ? 0.15 : 0;
    const speechDuration = duration * (1 - latencyReserve);
    const totalLatencyTime = duration * latencyReserve;
    const latencyPerGap = conversationTurns.length > 1 
      ? totalLatencyTime / (conversationTurns.length - 1) 
      : 0;
    
    let currentTime = 0;
    
    turnsWithWeight.forEach(({ turn, weight }, index) => {
      // Proportional speech duration based on word count
      const speechTime = (weight / totalWeight) * speechDuration;
      const endTime = currentTime + speechTime;
      
      generatedSegments.push({
        role: turn.role === "user" ? "user" : "agent",
        startTime: currentTime,
        endTime: endTime,
        label: turn.role === "user" ? "Caller" : "Agent",
      });
      
      currentTime = endTime;

      // Add latency gap between turns (not after the last one)
      if (index < conversationTurns.length - 1 && latencyPerGap > 0) {
        const latencyEnd = currentTime + latencyPerGap;
        
        generatedSegments.push({
          role: "silence",
          startTime: currentTime,
          endTime: latencyEnd,
        });
        
        currentTime = latencyEnd;
      }
    });
    
    return generatedSegments;
  }, [duration, conversationTurns]);

  // Draw waveform - Monochromatic design
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0 || duration === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barCount = waveformData.length;
    const barWidth = width / barCount;
    const gap = 1.5;

    ctx.clearRect(0, 0, width, height);

    // Draw waveform bars - monochromatic
    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * (height * 0.7);
      const y = (height - barHeight) / 2;
      
      const timeAtBar = (index / barCount) * duration;
      const segment = segments.find(
        (s) => timeAtBar >= s.startTime && timeAtBar < s.endTime
      );

      const playedRatio = currentTime / duration;
      const isPlayed = index / barCount <= playedRatio;

      // Monochromatic colors
      if (segment?.role === "silence") {
        // Silence gaps - darker/dimmer
        ctx.fillStyle = isPlayed ? "#525252" : "#404040";
      } else {
        // Speech - white/gray
        ctx.fillStyle = isPlayed ? "#ffffff" : "#a3a3a3";
      }

      const radius = Math.min(barWidth / 2 - gap / 2, 2);
      ctx.beginPath();
      ctx.roundRect(x + gap / 2, y, barWidth - gap, barHeight, radius);
      ctx.fill();
    });

    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(playheadX - 1, 0, 2, height);

  }, [waveformData, currentTime, duration, segments]);

  // Handle play/pause
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
    const canvas = canvasRef.current;
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

  // Calculate latency stats from segments
  const getLatencyStats = () => {
    const silenceSegments = segments.filter((s) => s.role === "silence");
    if (silenceSegments.length === 0) return null;

    const latencies = silenceSegments.map((s) => (s.endTime - s.startTime) * 1000);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    return { avg: avgLatency, max: maxLatency, min: minLatency, count: latencies.length };
  };

  const latencyStats = getLatencyStats();

  return (
    <div className="bg-neutral-950 rounded-xl p-5 space-y-3 border border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-200">Call Recording</span>
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Labels Row - Above Waveform */}
      {segments.length > 0 && duration > 0 && (
        <div className="relative h-5 w-full">
          {segments.map((segment, index) => {
            const leftPercent = (segment.startTime / duration) * 100;
            const widthPercent = ((segment.endTime - segment.startTime) / duration) * 100;
            
            if (segment.role === "silence") {
              const latencyMs = Math.round((segment.endTime - segment.startTime) * 1000);
              const latencyDisplay = latencyMs >= 1000 
                ? `${(latencyMs / 1000).toFixed(1)}s` 
                : `${latencyMs}ms`;
              
              if (widthPercent < 1.5) return null;
              
              return (
                <div
                  key={`label-${index}`}
                  className="absolute top-0 flex items-center justify-center h-full"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                >
                  <span className="text-[9px] text-neutral-600 font-mono">
                    {latencyDisplay}
                  </span>
                </div>
              );
            }
            
            if (widthPercent < 3) return null;
            
            return (
              <div
                key={`label-${index}`}
                className="absolute top-0 flex items-center h-full"
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
              >
                <span className="text-[10px] text-neutral-400 font-medium truncate">
                  {segment.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Waveform Visualization */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-16 cursor-pointer rounded"
          onClick={handleCanvasClick}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 pt-1">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
            onClick={() => skip(-10)}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white hover:bg-neutral-200 text-black"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
            onClick={() => skip(10)}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress Slider */}
        <div className="flex-1">
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <div className="w-16">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-neutral-600">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-white"></div>
            <span className="text-neutral-500">Speech</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-neutral-600"></div>
            <span className="text-neutral-500">Latency</span>
          </div>
        </div>
        
        {latencyStats && (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-neutral-600">Response Latency:</span>
            <span className="text-neutral-400">
              avg <span className="text-neutral-200">{latencyStats.avg.toFixed(0)}ms</span>
            </span>
            <span className="text-neutral-400">
              min <span className="text-neutral-200">{latencyStats.min.toFixed(0)}ms</span>
            </span>
            <span className="text-neutral-400">
              max <span className="text-neutral-200">{latencyStats.max.toFixed(0)}ms</span>
            </span>
          </div>
        )}
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
