"use client";

import { Container } from "@/components/landing/Container";
import { Layers, TestTube, Target, Play, History, MessageSquare, ArrowRight } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { ReactNode, MouseEvent, ElementType } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

interface Feature {
  title: string;
  description: string;
  icon: ElementType;
  link: string;
  className?: string;
  visual?: ReactNode;
}

function FeatureCard({ feature }: { feature: Feature }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      variants={itemVariants}
      className={`
        group relative flex flex-col p-8 rounded-2xl 
        bg-[#14151A]/60 backdrop-blur-sm border border-[#2A2A2A]
        hover:bg-[#18191F]/80
        transition-colors duration-500 cursor-pointer overflow-hidden
        ring-1 ring-white/5
        ${feature.className || "md:col-span-1"}
      `}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(94, 106, 210, 0.10),
              transparent 80%
            )
          `,
        }}
      />
      
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(94, 106, 210, 0.3),
              transparent 40%
            )
          `,
        }}
      />

      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#1E1F25] border border-[#2A2A2A] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#5E6AD2] group-hover:border-[#5E6AD2] transition-all duration-500 shadow-lg shadow-black/20">
          <feature.icon className="w-6 h-6 text-[#8A8F98] group-hover:text-white transition-colors duration-300" />
        </div>

        <h3 className="text-lg font-medium text-[#EEEEEE] mb-2 group-hover:text-white transition-colors flex items-center gap-2 tracking-tight">
          {feature.title}
          <ArrowRight className="w-4 h-4 text-[#5E6AD2] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        </h3>

        <p className="text-[15px] text-[#8A8F98] leading-relaxed mb-4 group-hover:text-[#A0A5B0] transition-colors">
          {feature.description}
        </p>

        {feature.visual && (
          <div className="mt-auto pt-4 border-t border-[#2A2A2A]/30 opacity-90 group-hover:opacity-100 transition-opacity duration-500">
            {feature.visual}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const FEATURES: Feature[] = [
  {
    title: "100s of Test Scenarios",
    description: "Analyse your prompt to auto-generate and run hundreds of test scenarios for evaluating your voice agents, saving you hours everyday.",
    icon: TestTube,
    link: "#",
    className: "md:col-span-2 md:row-span-1",
    visual: (
      <div className="mt-2 flex items-center justify-center gap-6 opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#5E6AD2]/20 border border-[#5E6AD2]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <TestTube className="w-5 h-5 text-[#5E6AD2]" />
          </div>
          <div className="w-16 h-0.5 bg-[#2A2A2A]">
            <motion.div 
              className="h-full bg-[#5E6AD2]" 
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
            100+ Tests Generated
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Streamline Test Batching",
    description: "Automatically groups and filters test cases into structured batches based on your conversation flow. Enables parallel testing across flow stages.",
    icon: Layers,
    link: "#",
    className: "md:col-span-1",
    visual: (
      <div className="mt-4 bg-[#1F2026] rounded-lg p-3 border border-[#2A2A2A] relative overflow-hidden group-hover:border-[#5E6AD2]/30 transition-colors shadow-inner">
        <div className="space-y-2">
          {['Batch 1', 'Batch 2', 'Batch 3'].map((batch, i) => (
            <div key={batch} className="flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#5E6AD2]" 
                  initial={{ width: "0%" }}
                  whileInView={{ width: `${80 - i * 15}%` }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              </div>
              <span className="text-[9px] text-[#555]">{batch}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    title: "Evaluate Outcomes & Take Action",
    description: "Review results, identify issues, and get actionable suggestions based on the evaluation outcomes to improve your voice agents faster.",
    icon: Target,
    link: "#",
    className: "md:col-span-1",
    visual: (
      <div className="mt-4 flex flex-wrap gap-2">
        {['Pass', 'Fail', 'Review'].map((status) => (
          <div key={status} className={`px-2 py-1 rounded text-[10px] font-medium ${
            status === 'Pass' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
            status === 'Fail' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
            'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
          }`}>
            {status}
          </div>
        ))}
      </div>
    )
  },
  {
    title: "Replay Conversations",
    description: "Replay any test call anytime, with full audio and transcript, to quickly spot gaps and refine agents for more natural conversations.",
    icon: Play,
    link: "#",
    className: "md:col-span-2",
    visual: (
      <div className="mt-6 flex items-center gap-4 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden relative">
            <motion.div 
              initial={{ x: '-100%' }}
              whileInView={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.6, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5E6AD2] to-transparent opacity-70"
            />
          </div>
        ))}
        <div className="px-2 py-1 rounded bg-[#5E6AD2]/10 text-[#5E6AD2] text-[10px] font-medium border border-[#5E6AD2]/20 flex items-center gap-1">
          <Play className="w-3 h-3" />
          Replay
        </div>
      </div>
    )
  },
  {
    title: "Change Logs",
    description: "Track every update and change in one place, identify new issues or improvements and tie them back to recent changes accurately.",
    icon: History,
    link: "#",
    className: "md:col-span-1",
    visual: (
      <div className="mt-4 space-y-2">
        {['v2.1.0', 'v2.0.5', 'v2.0.4'].map((version, i) => (
          <div key={version} className="flex items-center gap-2 text-[10px]">
            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-green-500' : 'bg-[#555]'}`} />
            <span className="text-[#8A8F98]">{version}</span>
            <span className="text-[#555] ml-auto">{i === 0 ? 'Latest' : `${i * 3}d ago`}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    title: "Prompt Feedback & Suggestions",
    description: "Get real-time feedback and actionable suggestions to optimize prompt responses and user engagement.",
    icon: MessageSquare,
    link: "#",
    className: "md:col-span-1",
    visual: (
      <div className="mt-4 bg-[#1F2026] rounded border border-[#2A2A2A] p-3 group-hover:border-[#5E6AD2]/30 transition-colors">
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-6 h-6 rounded bg-[#5E6AD2]/20 flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-[#5E6AD2]" />
          </div>
          <span className="text-[#8A8F98]">3 suggestions</span>
          <span className="ml-auto px-1.5 py-0.5 rounded bg-[#5E6AD2]/10 text-[#5E6AD2] text-[9px]">New</span>
        </div>
      </div>
    )
  },
];

export function Features() {
  return (
    <section id="features" className="py-32 bg-[#0B0C10]">
      <Container>
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-6 max-w-xs mx-auto">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#2A2A2A]" />
            <span className="text-xs font-semibold text-[#5E6AD2] uppercase tracking-widest px-3 py-1 border border-[#5E6AD2]/20 rounded-full bg-[#5E6AD2]/5 shadow-[0_0_10px_-3px_rgba(94,106,210,0.2)]">How It Works</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#2A2A2A]" />
          </div>
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-semibold text-[#EEEEEE] mb-6 tracking-tighter leading-[1.1]">
              Auto-generate & run <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-[#A0A8F0]">test scenarios</span>
            </h2>
            <p className="text-xl text-[#8A8F98] leading-relaxed">
              Automatically run hundreds of test scenarios to test voice AI agents and ensure reliability.
            </p>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
