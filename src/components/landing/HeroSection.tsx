"use client";

import { Container } from "@/components/landing/Container";
import { Button } from "@/components/landing/Button";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Activity,
  Sparkles,
  Play,
  Mic,
  LayoutDashboard,
  Users,
  PlayCircle,
  CalendarClock,
  Settings,
  ChevronLeft,
  Square,
  RefreshCw,
  Target,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { StarField } from "@/components/landing/StarField";

export function HeroSection() {
  const [waveIndex, setWaveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveIndex((prev) => (prev + 1) % 20);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-48 pb-24 overflow-hidden">
      <StarField />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#5E6AD2] opacity-[0.12] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[#5F6BD3] opacity-[0.08] blur-[150px] rounded-full pointer-events-none z-0" />

      <Container className="relative z-10 flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-semibold text-[#EEEEEE] mb-6 max-w-4xl leading-[1.1] tracking-tight"
        >
          Test Your AI Agents <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-[#A0A8F0]">
            Before They Go Live
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-[#8A8F98] max-w-2xl mb-10 leading-relaxed"
        >
          Evaluate voice and chat conversational AI agents in real world
          scenarios to ensure reliability before deployment
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto"
        >
          <Button
            size="lg"
            className="gap-2 group bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90 font-medium px-8 h-12 w-full sm:w-auto shadow-[0_0_20px_-5px_rgba(94,106,210,0.4)] transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(94,106,210,0.6)] hover:scale-[1.02] border-none"
          >
            Start Testing Free{" "}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="gap-2 font-medium px-8 h-12 bg-white/5 border border-white/5 hover:bg-white/10 w-full sm:w-auto backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-white/10"
          >
            Watch Demo
          </Button>
        </motion.div>

        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="mt-8 text-sm text-[#555] font-medium"
        >
          No credit card required • 100 free test calls per month
        </motion.div> */}

        {/* Voice Agent Testing Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 w-full max-w-[1200px] rounded-xl border border-[#2A2A2A] bg-[#0B0C10]/80 backdrop-blur-xl shadow-2xl overflow-hidden relative group ring-1 ring-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#5E6AD2]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

          {/* Browser Header */}
          <div className="h-11 border-b border-[#2A2A2A] bg-[#14151A]/90 backdrop-blur-md flex items-center px-4 gap-2 z-10 relative">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#292929] group-hover:bg-[#FF5F56] transition-colors duration-300" />
              <div className="w-3 h-3 rounded-full bg-[#292929] group-hover:bg-[#FFBD2E] transition-colors duration-300" />
              <div className="w-3 h-3 rounded-full bg-[#292929] group-hover:bg-[#27C93F] transition-colors duration-300" />
            </div>
            <div className="mx-auto text-xs font-mono text-[#555] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              voiceqa.app/dashboard
            </div>
          </div>

          <div className="flex h-[550px] text-left relative z-10">
            {/* Sidebar */}
            <div className="w-56 border-r border-[#2A2A2A] bg-[#111216]/50 backdrop-blur-sm hidden md:flex md:flex-col">
              <div className="p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2 text-[#EEEEEE] text-sm font-semibold">
                  <Bot className="w-4 h-4 text-[#5E6AD2]" />
                  Voice QA
                </div>
              </div>

              <div className="p-3 space-y-0.5">
                {[
                  { icon: LayoutDashboard, name: "Dashboard", active: false },
                  { icon: Users, name: "Agents", active: false },
                  { icon: PlayCircle, name: "Test Runs", active: true },
                  { icon: CalendarClock, name: "Test Schedules", active: false },
                  { icon: Activity, name: "Monitoring", active: false },
                  { icon: Settings, name: "Settings", active: false },
                ].map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      item.active
                        ? "bg-[#1F2026] text-[#EEEEEE] shadow-sm ring-1 ring-white/5"
                        : "text-[#8A8F98] hover:text-[#EEEEEE] hover:bg-[#1F2026]/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-[#0B0C10]/50 flex flex-col relative">
              {/* Header */}
              <div className="h-16 border-b border-[#2A2A2A] flex items-center justify-between px-6 bg-[#111216]/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[#EEEEEE] font-medium text-lg">
                    Customer Support Bot
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#5E6AD2]/15 text-[#5E6AD2] border border-[#5E6AD2]/20">
                    ElevenLabs
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 shadow-[0_0_10px_-3px_rgba(74,222,128,0.2)]">
                    23/24 Passed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs gap-1.5 bg-[#1F2026] hover:bg-[#2A2A2A] border-[#2A2A2A] text-[#EEEEEE] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs gap-1.5 bg-[#1F2026] hover:bg-[#2A2A2A] border-[#2A2A2A] text-[#EEEEEE] transition-colors"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs gap-1.5 bg-[#1F2026] hover:bg-[#2A2A2A] border-[#2A2A2A] text-[#EEEEEE] transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Test Results Content */}
              <div className="flex-1 overflow-hidden p-6 space-y-6">
                {/* Test Summary Cards */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[#14151A] rounded-lg p-3 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[#8A8F98] text-xs">Total Agents</div>
                      <div className="w-6 h-6 rounded-md bg-slate-700/50 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-[#8A8F98]" />
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-[#EEEEEE]">8</div>
                    <div className="text-[10px] text-[#555]">Connected voice agents</div>
                  </div>
                  <div className="bg-[#14151A] rounded-lg p-3 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[#8A8F98] text-xs">Test Cases</div>
                      <div className="w-6 h-6 rounded-md bg-slate-600/50 flex items-center justify-center">
                        <Target className="w-3 h-3 text-[#8A8F98]" />
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-[#EEEEEE]">142</div>
                    <div className="text-[10px] text-[#555]">Total test scenarios</div>
                  </div>
                  <div className="bg-[#14151A] rounded-lg p-3 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[#8A8F98] text-xs">Test Runs</div>
                      <div className="w-6 h-6 rounded-md bg-indigo-600/30 flex items-center justify-center">
                        <BarChart3 className="w-3 h-3 text-indigo-400" />
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-[#EEEEEE]">37</div>
                    <div className="text-[10px] text-[#555]">Completed test runs</div>
                  </div>
                  <div className="bg-[#14151A] rounded-lg p-3 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[#8A8F98] text-xs">Pass Rate</div>
                      <div className="w-6 h-6 rounded-md bg-green-600/20 flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-green-400">95.8%</div>
                    <div className="text-[10px] text-[#555]">Overall success rate</div>
                  </div>
                </div>

                {/* Conversation Preview */}
                <div className="bg-[#14151A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-[#5E6AD2]" />
                      <span className="text-sm font-medium text-[#EEEEEE]">
                        Conversation Transcript
                      </span>
                    </div>
                    <span className="text-xs text-[#555]">Test Case #1</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* User Message */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs text-[#8A8F98]">
                        U
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-[#555] mb-1">
                          TEST CALLER
                        </div>
                        <div className="bg-[#1F2026] rounded-lg p-3 text-sm text-[#EEEEEE]">
                          Hi, I need help with my recent order. It hasn&apos;t
                          arrived yet.
                        </div>
                      </div>
                    </div>
                    {/* Agent Message */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5E6AD2] to-[#434D99] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-[#555] mb-1">
                          AI AGENT
                        </div>
                        <div className="bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 rounded-lg p-3 text-sm text-[#EEEEEE]">
                          I&apos;d be happy to help you track your order! Could
                          you please provide your order number?
                        </div>
                        {/* Audio Waveform */}
                        <div className="mt-2 flex items-center gap-1">
                          {Array.from({ length: 30 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-[#5E6AD2] rounded-full transition-all duration-100"
                              style={{
                                height: `${
                                  Math.sin((i + waveIndex) * 0.5) * 10 + 12
                                }px`,
                                opacity: i < 25 ? 1 : 0.3,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prompt Analysis */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.5, duration: 0.5 }}
                  className="absolute bottom-6 right-6 max-w-xs bg-[#1E1F26] border border-[#333] rounded-lg shadow-2xl shadow-black/50 p-4 z-20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#5E6AD2]" />
                      <span className="text-xs font-semibold text-[#EEEEEE]">
                        Prompt Analysis
                      </span>
                    </div>
                    <span className="text-[10px] text-[#555]">STABLR</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-[11px] text-[#8A8F98]">System prompt compliance: 98%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-[11px] text-[#8A8F98]">Intent detection: Accurate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-[11px] text-[#8A8F98]">No hallucinations detected</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
