"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ConversationTurn {
  role: string;
  content: string;
  timestamp?: string;
  startTime?: number;
  endTime?: number;
  latency_ms?: number;
}

interface ModernAudioPlayerProps {
  src: string;
  conversationTurns?: ConversationTurn[];
  onTimeUpdate?: (currentTime: number) => void;
}

interface WaveformSegment {
  role: "agent" | "user";
  startTime: number;
  endTime: number;
  amplitudes: number[];
}

// Generate realistic speech waveform amplitudes
function generateSpeechAmplitudes(duration: number, pixelsPerSecond: number, seed: number): number[] {
  const sampleCount = Math.max(10, Math.floor(duration * pixelsPerSecond));
  const amplitudes: number[] = [];
  
  const phraseLength = 15 + (seed % 10);
  
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const edgeFade = Math.min(t * 8, (1 - t) * 8, 1);
    const phrasePos = (i % phraseLength) / phraseLength;
    const phraseEnv = 0.6 + 0.4 * Math.sin(phrasePos * Math.PI);
    const wordFreq = 3 + (seed % 3);
    const wordEnv = 0.7 + 0.3 * Math.sin(i * wordFreq * 0.5);
    const hash = ((i * 9301 + seed * 49297) % 233280) / 233280;
    const noise = 0.15 + hash * 0.85;
    const amp = edgeFade * phraseEnv * wordEnv * noise;
    amplitudes.push(Math.max(0.08, Math.min(1, amp)));
  }
  
  return amplitudes;
}

export function ModernAudioPlayer({
  src,
  conversationTurns = [],
  onTimeUpdate,
}: ModernAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Generate waveform segments
  const { segments, avgLatency, gaps } = useMemo(() => {
    if (duration <= 0 || conversationTurns.length === 0) {
      return { segments: [] as WaveformSegment[], avgLatency: 0, gaps: [] };
    }

    const segs: WaveformSegment[] = [];
    const gapsList: { startTime: number; endTime: number; latencyMs: number }[] = [];
    const pixelsPerSecond = canvasWidth / duration;

    const turnsWithWeight = conversationTurns.map((turn, idx) => {
      const words = turn.content?.split(/\s+/).length || 5;
      return { turn, weight: words, idx };
    });

    const totalWeight = turnsWithWeight.reduce((s, t) => s + t.weight, 0);
    const gapCount = conversationTurns.length - 1;
    
    const hasRealLatency = conversationTurns.some(t => t.latency_ms && t.latency_ms > 0);
    const totalRealLatencyMs = conversationTurns.reduce((sum, t) => sum + (t.latency_ms || 0), 0);
    
    const gapTime = hasRealLatency 
      ? Math.min(totalRealLatencyMs / 1000, duration * 0.3)
      : (gapCount > 0 ? 0.12 * duration : 0);
    
    const speechTime = duration - gapTime;

    let currentT = 0;

    turnsWithWeight.forEach(({ turn, weight, idx }) => {
      const segDuration = (weight / totalWeight) * speechTime;
      
      segs.push({
        role: turn.role === "user" ? "user" : "agent",
        startTime: currentT,
        endTime: currentT + segDuration,
        amplitudes: generateSpeechAmplitudes(segDuration, pixelsPerSecond, idx * 12345),
      });

      currentT += segDuration;
      
      if (idx < conversationTurns.length - 1) {
        const nextTurn = conversationTurns[idx + 1];
        const realLatencyMs = nextTurn?.latency_ms || 0;
        
        let gapDuration: number;
        if (hasRealLatency && realLatencyMs > 0) {
          gapDuration = (realLatencyMs / totalRealLatencyMs) * gapTime;
        } else {
          gapDuration = gapCount > 0 ? gapTime / gapCount : 0;
        }
        
        gapsList.push({
          startTime: currentT,
          endTime: currentT + gapDuration,
          latencyMs: realLatencyMs > 0 ? realLatencyMs : gapDuration * 1000,
        });
        currentT += gapDuration;
      }
    });

    const latencies = gapsList.map(g => g.latencyMs);
    const avgLat = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

    return { 
      segments: segs, 
      avgLatency: avgLat,
      gaps: gapsList,
    };
  }, [duration, conversationTurns, canvasWidth]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
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

    const waveformHeight = height * 0.65;
    const dimensionY = height * 0.82;
    const centerY = waveformHeight / 2;

    const waveColors = {
      user: { played: "#000000", unplayed: "rgba(0, 0, 0, 0.2)" },
      agent: { played: "#000000", unplayed: "rgba(0, 0, 0, 0.2)" }
    };

    // Draw segments
    segments.forEach((seg) => {
      const startX = (seg.startTime / duration) * width;
      const endX = (seg.endTime / duration) * width;
      const segWidth = endX - startX;
      
      const barCount = seg.amplitudes.length;
      const barWidth = segWidth / barCount;
      const barGap = 1;
      const maxHeight = waveformHeight * 0.9;
      
      const colors = seg.role === "user" ? waveColors.user : waveColors.agent;

      seg.amplitudes.forEach((amp, i) => {
        const x = startX + i * barWidth;
        const barH = amp * maxHeight;
        const timeAtBar = seg.startTime + (i / barCount) * (seg.endTime - seg.startTime);
        const isPlayed = timeAtBar <= currentTime;

        ctx.fillStyle = isPlayed ? colors.played : colors.unplayed;

        const w = Math.max(2, barWidth - barGap);
        const radius = w / 2;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barH / 2, w, barH, radius);
        ctx.fill();
      });
    });

    // Draw latency indicators
    const maxLabelsToShow = 4;
    const skipEvery = gaps.length > maxLabelsToShow ? Math.ceil(gaps.length / maxLabelsToShow) : 1;
    
    gaps.forEach((gap, index) => {
      const startX = (gap.startTime / duration) * width;
      const endX = (gap.endTime / duration) * width;
      const midX = (startX + endX) / 2;
      const gapWidth = endX - startX;
      
      if (index % skipEvery !== 0) return;
      
      const latencyText = gap.latencyMs >= 1000 
        ? `${(gap.latencyMs / 1000).toFixed(1)}s`
        : `${Math.round(gap.latencyMs)}ms`;
      
      // Monochrome gray style
      ctx.strokeStyle = "#9ca3af";
      ctx.fillStyle = "#9ca3af";
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(startX + 2, dimensionY);
      ctx.lineTo(endX - 2, dimensionY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(startX + 2, dimensionY - 3);
      ctx.lineTo(startX + 2, dimensionY + 3);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(endX - 2, dimensionY - 3);
      ctx.lineTo(endX - 2, dimensionY + 3);
      ctx.stroke();
      
      if (gapWidth > 15) {
        ctx.font = "bold 9px system-ui, sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(latencyText, midX, dimensionY + 5);
      }
    });

    // Draw playhead
    if (currentTime > 0 || isPlaying) {
      const playX = (currentTime / duration) * width;
      
      ctx.fillStyle = "#000000";
      ctx.fillRect(playX - 1, 0, 2, waveformHeight);
      
      ctx.beginPath();
      ctx.arc(playX, 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();
    }

  }, [segments, gaps, currentTime, duration, isPlaying]);

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
    } catch (err) {
      console.error("Playback error:", err);
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0] / 100;
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (sec: number) => {
    if (!audioRef.current) return;
    const t = Math.max(0, Math.min(duration, currentTime + sec));
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDuration = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Call Recording</span>
            <span className="text-[10px] text-slate-400">{formatDuration(duration)} duration</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-2 py-1 rounded-md bg-white/5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span className="text-[10px] text-slate-300 font-medium">Caller</span>
            </div>
            <div className="w-px h-3 bg-slate-600" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span className="text-[10px] text-slate-300 font-medium">Agent</span>
            </div>
          </div>

          {avgLatency > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10">
              <span className="text-[10px] font-medium text-slate-300">
                {avgLatency >= 1000 ? `${(avgLatency/1000).toFixed(1)}s` : `${Math.round(avgLatency)}ms`} avg
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Waveform */}
      <div className="relative px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
        <canvas
          ref={canvasRef}
          className="w-full h-16 cursor-pointer"
          onClick={handleCanvasClick}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs font-mono text-slate-500 w-10 tabular-nums">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200" 
            onClick={() => skip(-10)}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button 
            size="icon" 
            className="h-9 w-9 mx-1 rounded-full bg-slate-900 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 transition-all hover:scale-105 shadow"
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4 text-white dark:text-slate-900" /> : <Play className="h-4 w-4 ml-0.5 text-white dark:text-slate-900" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200" 
            onClick={() => skip(10)}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 mx-2">
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            max={100}
            step={0.1}
            className="cursor-pointer"
            onValueChange={(v) => {
              if (audioRef.current && duration > 0) {
                const t = (v[0] / 100) * duration;
                audioRef.current.currentTime = t;
                setCurrentTime(t);
              }
            }}
          />
        </div>

        <span className="text-xs font-mono text-slate-400 w-10 tabular-nums text-right">
          {formatTime(duration)}
        </span>

        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" 
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <div className="w-16">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
    </div>
  );
}
