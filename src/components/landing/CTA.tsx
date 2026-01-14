"use client";

import { Container } from "@/components/landing/Container";
import { Button } from "@/components/landing/Button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function CTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5F6BD4] opacity-[0.18] blur-[140px] rounded-full pointer-events-none" />

      <Container className="relative z-10">
        <div className="relative overflow-hidden rounded-3xl border border-[#2B2B2B] bg-[#0B0C10] shadow-2xl p-8 md:p-16 text-center ring-1 ring-white/5 group">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
          
          <div className="absolute inset-0 bg-gradient-to-b from-[#5E6AD2]/10 via-transparent to-transparent pointer-events-none opacity-60" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col items-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 mb-8 shadow-[0_0_15px_-3px_rgba(94,106,210,0.3)]">
              <Sparkles className="w-3.5 h-3.5 text-[#5E6AD2]" />
              <span className="text-xs font-medium text-[#5E6AD2]">Start testing today</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-semibold text-[#EEEEEE] mb-8 leading-[1.1] tracking-tighter">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-[#A0A8F0]">test your AI agents?</span>
            </h2>

            <p className="text-xl text-[#8A8F98] mb-10 max-w-xl leading-relaxed">
              Start testing your voice AI agents today. Simulate real conversations, 
              identify failures early, and deploy with confidence.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2 w-full sm:w-auto bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90 shadow-[0_0_20px_-5px_rgba(94,106,210,0.4)] transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(94,106,210,0.6)] hover:scale-[1.02] border-none font-medium h-12 px-8">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto bg-white/5 border border-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-white/10 font-medium h-12 px-8">
                Book a Demo
              </Button>
            </div>

            <p className="mt-8 text-sm text-[#555] font-medium">
              100 free test calls per month • No credit card required
            </p>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
