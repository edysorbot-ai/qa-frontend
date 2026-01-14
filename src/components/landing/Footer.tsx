import { Container } from "@/components/landing/Container";
import { Github, Twitter, Linkedin } from "lucide-react";
import Link from "next/link";

const FOOTER_LINKS = {
  product: [
    { title: "Features", href: "#features" },
    { title: "Pricing", href: "#pricing" },
    { title: "Integrations", href: "#" },
    { title: "Changelog", href: "#" },
  ],
  resources: [
    { title: "Documentation", href: "#" },
    { title: "API Reference", href: "#" },
    { title: "Blog", href: "#" },
    { title: "Support", href: "#" },
  ],
  company: [
    { title: "About", href: "#" },
    { title: "Careers", href: "#" },
    { title: "Contact", href: "#" },
    { title: "Privacy", href: "#" },
  ],
  providers: [
    { title: "ElevenLabs", href: "#" },
    { title: "Retell", href: "#" },
    { title: "VAPI", href: "#" },
    { title: "OpenAI Realtime", href: "#" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[#0B0C10] pt-32 pb-12">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Logo and Social Links */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 text-[#EEEEEE] font-medium mb-6 text-lg">
              <div className="w-8 h-8 bg-[#5E6AD2] rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm" />
              </div>
              <span className="font-semibold tracking-tight">VoiceQA</span>
            </div>
            <p className="text-sm text-[#8A8F98] mb-6 max-w-xs">
              Automated testing and quality assurance for voice AI agents.
            </p>
            <div className="flex gap-4">
              <Link 
                href="https://twitter.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-[#14151A] border border-[#2A2A2A] text-[#8A8F98] hover:text-[#EEEEEE] hover:border-[#5E6AD2] transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </Link>
              <Link 
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-[#14151A] border border-[#2A2A2A] text-[#8A8F98] hover:text-[#EEEEEE] hover:border-[#5E6AD2] transition-colors"
              >
                <Github className="w-4 h-4" />
              </Link>
              <Link 
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-[#14151A] border border-[#2A2A2A] text-[#8A8F98] hover:text-[#EEEEEE] hover:border-[#5E6AD2] transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          {/* Product Links */}
          <div>
            <h4 className="text-[#EEEEEE] font-medium mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-[#8A8F98]">
              {FOOTER_LINKS.product.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="hover:text-[#EEEEEE] transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-[#EEEEEE] font-medium mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-[#8A8F98]">
              {FOOTER_LINKS.resources.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="hover:text-[#EEEEEE] transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-[#EEEEEE] font-medium mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-[#8A8F98]">
              {FOOTER_LINKS.company.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="hover:text-[#EEEEEE] transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Providers Links */}
          <div>
            <h4 className="text-[#EEEEEE] font-medium mb-4">Providers</h4>
            <ul className="space-y-3 text-sm text-[#8A8F98]">
              {FOOTER_LINKS.providers.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="hover:text-[#EEEEEE] transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#2A2A2A] text-xs text-[#555]">
          <div>&copy; {currentYear} VoiceQA. All rights reserved.</div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-[#8A8F98] transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-[#8A8F98] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
