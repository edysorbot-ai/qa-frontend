"use client";

import { Container } from "@/components/landing/Container";
import { Button } from "@/components/landing/Button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_LINKS = [
  { title: "Features", href: "#features" },
  { title: "Pricing", href: "#pricing" },
  { title: "Docs", href: "#docs" },
];

const menuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }
  },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } }
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isOpen ? "bg-[#0B0C10]/80 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <Container className="flex items-center justify-between h-[72px]">
        <Link href="/" className="group flex items-center gap-3 text-[#EEEEEE] font-medium text-lg z-50">
          <div className="w-8 h-8 bg-[#5E6AD2] rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-4 h-4 bg-white rounded-sm" />
          </div>
          <span className="font-bold tracking-tight">VoiceQA</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#8A8F98]">
          {NAV_LINKS.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className="hover:text-[#EEEEEE] transition-colors"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-5">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/sign-in" className="text-[15px] font-medium text-[#8A8F98] hover:text-[#EEEEEE] transition-colors">Sign in</Link>
            <Link href="/sign-up">
              <Button size="sm" className="h-9 px-5 text-[14px] font-medium bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90 transition-all duration-300 hover:shadow-[0_0_15px_-3px_rgba(94,106,210,0.4)] hover:scale-105">Get started</Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <motion.button 
            className="md:hidden text-[#EEEEEE] p-2 -mr-2 z-50" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.div>
          </motion.button>
        </div>
      </Container>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed top-0 left-0 right-0 h-screen z-40 bg-[#0B0C10]/95 backdrop-blur-lg pt-[72px] px-4 pb-8 overflow-y-auto"
          >
            <motion.div 
              className="flex flex-col gap-6 p-4"
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <nav className="flex flex-col gap-2">
                {NAV_LINKS.map((item) => (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link 
                      href={item.href} 
                      className="block text-lg font-medium text-[#EEEEEE] py-3 border-b border-[#2A2A2A] hover:text-[#5E6AD2] transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.title}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              
              <motion.div 
                className="flex flex-col gap-4 mt-4"
                variants={itemVariants}
              >
                <Link href="/sign-in" onClick={() => setIsOpen(false)} className="text-center py-3 font-medium text-[#8A8F98] hover:text-[#EEEEEE] transition-colors">
                  Sign in
                </Link>
                <Link href="/sign-up" onClick={() => setIsOpen(false)}>
                  <Button className="w-full h-12 text-base font-medium bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90 transition-all hover:scale-[1.02]">
                    Get started
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
