"use client";

import { Container } from "@/components/landing/Container";
import { Button } from "@/components/landing/Button";
import { Shield, Activity, ChevronRight, CheckCircle2, Bell, AlertTriangle, Clock, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export function ProductDetails() {
  return (
    <>
      {/* AI-Powered Call Monitoring & Compliance */}
      <section className="py-32 bg-[#0B0C10] overflow-hidden">
        <Container>
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="flex items-center gap-4 mb-6 max-w-xs mx-auto">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#2A2A2A]" />
              <span className="text-xs font-semibold text-[#5E6AD2] uppercase tracking-widest px-3 py-1 border border-[#5E6AD2]/20 rounded-full bg-[#5E6AD2]/5 shadow-[0_0_10px_-3px_rgba(94,106,210,0.2)]">Monitoring</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#2A2A2A]" />
            </div>
            <h2 className="text-4xl md:text-6xl font-semibold text-[#EEEEEE] mb-6 tracking-tighter leading-[1.1]">
              Monitoring & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-[#A0A8F0]">Observability</span>
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E6AD2]/10 text-[#5E6AD2] text-xs font-medium mb-6 border border-[#5E6AD2]/20 shadow-[0_0_15px_-3px_rgba(94,106,210,0.3)]">
                <Shield className="w-3 h-3" /> AI-Powered Monitoring
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-[#EEEEEE] mb-6 leading-[1.1] tracking-tight">
                AI-Powered Call Monitoring & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-[#A0A8F0]">Compliance</span>
              </h2>
              <p className="text-lg text-[#8A8F98] mb-8 leading-relaxed max-w-lg">
                Ensure flawless conversations with real-time call monitoring, instant transcript evaluation, and automatic detection of compliance breaches, call drops or agent deviations.
              </p>
              <Button variant="secondary" className="gap-2 h-11 px-6 hover:bg-white/5 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all hover:border-white/20">
                Learn more <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 w-full relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5D69D1] opacity-[0.08] blur-[120px] -z-10" />
              
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#121317]/80 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="text-[10px] font-mono text-[#555]">Compliance Monitor</div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <div className="bg-[#1F2026] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-4 h-4 text-[#5E6AD2]" />
                      <span className="text-sm font-medium text-[#EEEEEE]">Compliance Check</span>
                      <span className="ml-auto px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                    </div>
                    <ul className="space-y-2 text-[12px] text-[#8A8F98]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        Guardrails enforced
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        Off-topic handling verified
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                        1 deviation detected
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1F2026] border border-[#2A2A2A] rounded-lg p-3 text-center">
                      <div className="text-2xl font-semibold text-[#EEEEEE]">98%</div>
                      <div className="text-[10px] text-[#8A8F98]">Compliance Rate</div>
                    </div>
                    <div className="bg-[#1F2026] border border-[#2A2A2A] rounded-lg p-3 text-center">
                      <div className="text-2xl font-semibold text-green-400">0</div>
                      <div className="text-[10px] text-[#8A8F98]">Call Drops</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Real-Time Sentiment Tracking & Test Scheduling */}
      <section className="py-32 bg-[#0B0C10] relative">
        <Container>
          <div className="flex flex-col md:flex-row-reverse items-center gap-20">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium mb-6 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <Activity className="w-3 h-3" /> Real-Time Tracking
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-[#EEEEEE] mb-6 leading-[1.1] tracking-tight">
                Real-Time Sentiment Tracking & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Test Scheduling</span>
              </h2>
              <p className="text-lg text-[#8A8F98] mb-8 leading-relaxed">
                Monitor real-time AI agent call failures, sentiment changes and run recurring scheduled tests on live agents to ensure consistent agent evaluation.
              </p>
              <Button variant="secondary" className="gap-2 h-11 px-6 hover:bg-white/5 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all">
                See how it works <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 w-full">
              <div className="rounded-xl border border-[#2A2A2A] bg-[#111216] overflow-hidden shadow-2xl ring-1 ring-white/5 group hover:border-[#3A3A3A] transition-all duration-300">
                <div className="h-10 border-b border-[#2A2A2A] flex items-center justify-between bg-[#16171C] px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                    </span>
                  </div>
                  <span className="text-xs text-[#8A8F98] font-mono opacity-70">Sentiment Dashboard</span>
                  <div className="w-16" />
                </div>

                <div className="p-6 bg-[#0B0C10] relative space-y-4">
                  {/* Sentiment Chart */}
                  <div className="bg-[#1F2026] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#EEEEEE]">Sentiment Trend</span>
                      <span className="text-[10px] text-green-400">+12% ↑</span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 55, 45, 60, 75, 70, 85, 80, 90, 88].map((h, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className={`flex-1 rounded-t ${h > 70 ? 'bg-green-500' : h > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Scheduled Tests */}
                  <div className="bg-[#1F2026] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-[#5E6AD2]" />
                      <span className="text-sm font-medium text-[#EEEEEE]">Scheduled Tests</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { time: '09:00 AM', name: 'Daily Health Check', status: 'active' },
                        { time: '02:00 PM', name: 'Load Test', status: 'pending' },
                      ].map((test) => (
                        <div key={test.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#555]">{test.time}</span>
                            <span className="text-[#8A8F98]">{test.name}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            test.status === 'active' 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-[#2A2A2A] text-[#555]'
                          }`}>
                            {test.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Instant Alerts Section */}
      <section className="py-32 bg-[#0B0C10] overflow-hidden">
        <Container>
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium mb-6 border border-orange-500/20 shadow-[0_0_15px_-3px_rgba(249,115,22,0.2)]">
                <Bell className="w-3 h-3" /> Instant Alerts
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-[#EEEEEE] mb-6 leading-[1.1] tracking-tight">
                Instant Alerts for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Agent Performance</span>
              </h2>
              <p className="text-lg text-[#8A8F98] mb-8 leading-relaxed max-w-lg">
                Get instant alerts across Email, Slack, and other channels when agent performance drops, allowing immediate corrective action.
              </p>
              <Button variant="secondary" className="gap-2 h-11 px-6 hover:bg-white/5 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all hover:border-white/20">
                Configure Alerts <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 w-full relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500 opacity-[0.05] blur-[120px] -z-10" />
              
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#121317]/80 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="text-[10px] font-mono text-[#555]">Alert Center</div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  {/* Alert Channels */}
                  <div className="flex gap-3">
                    {[
                      { icon: Mail, name: 'Email', active: true },
                      { icon: MessageSquare, name: 'Slack', active: true },
                      { icon: Bell, name: 'Webhook', active: false },
                    ].map((channel) => (
                      <div key={channel.name} className={`flex-1 p-3 rounded-lg border ${
                        channel.active 
                          ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/30' 
                          : 'bg-[#1F2026] border-[#2A2A2A]'
                      }`}>
                        <channel.icon className={`w-4 h-4 mb-2 ${channel.active ? 'text-[#5E6AD2]' : 'text-[#555]'}`} />
                        <div className="text-[11px] text-[#8A8F98]">{channel.name}</div>
                        <div className={`text-[9px] ${channel.active ? 'text-green-400' : 'text-[#555]'}`}>
                          {channel.active ? 'Connected' : 'Not configured'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Alert */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Performance Alert</span>
                      <span className="ml-auto text-[10px] text-[#555]">2 min ago</span>
                    </div>
                    <p className="text-[12px] text-[#8A8F98]">
                      Agent response time exceeded threshold (3.2s &gt; 2s) on &quot;Support Bot&quot;
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
