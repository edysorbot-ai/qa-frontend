"use client";

import { Container } from "@/components/landing/Container";
import { motion } from "framer-motion";

const PROVIDERS = [
  "ElevenLabs", "Retell", "VAPI", "Bolna", "LiveKit", "Haptik"
];

export function TrustBar() {
  return (
    <section className="py-20 bg-[#0B0C10] overflow-hidden relative border-y border-[#1F2026]">
      <Container>
        <p className="text-center text-md text-white mb-12 font-medium tracking-[0.2em] uppercase opacity-60">
          Test voice agents from leading providers
        </p>
        
        <div className="relative w-full max-w-[100vw] -mx-6 md:mx-0">
          {/* Gradient Masks for smooth fade out */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0B0C10] via-[#0B0C10]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0B0C10] via-[#0B0C10]/80 to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div 
              initial={{ x: 0 }}
              animate={{ x: "-50%" }}
              transition={{ 
                repeat: Infinity, 
                ease: "linear", 
                duration: 20 
              }}
              className="flex items-center gap-16 md:gap-28 pr-16 md:pr-28 whitespace-nowrap"
            >
              {[...PROVIDERS, ...PROVIDERS].map((provider, i) => (
                <div 
                  key={`${provider}-${i}`} 
                  className="text-2xl md:text-3xl font-bold font-sans text-[#EEEEEE] hover:text-[#EEEEEE] transition-all duration-500 cursor-default select-none tracking-tight"
                >
                  {provider}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
