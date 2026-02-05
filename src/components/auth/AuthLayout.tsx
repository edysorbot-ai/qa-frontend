"use client";

import Image from "next/image";
import Link from "next/link";

// Integration icons as simple SVG components for a clean look
const IntegrationIcon = ({ name }: { name: string }) => {
  const iconClasses = "w-5 h-5";
  
  switch (name) {
    case "ElevenLabs":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 4h2v16H8V4zm6 0h2v16h-2V4z" />
        </svg>
      );
    case "Retell":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </svg>
      );
    case "VAPI":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    case "Bolna":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z" />
        </svg>
      );
    case "LiveKit":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      );
    case "Haptik":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
        </svg>
      );
    case "OpenAI":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6407 4.4708 4.4708 0 0 1 .5765 3.0283zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7225zm1.0974-2.3617l2.603-1.5006 2.6029 1.5006v3.0013L12.0004 15.365l-2.603-1.5007V10.863z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
};

// Integration data
const INTEGRATIONS = [
  { name: "ElevenLabs" },
  { name: "Retell" },
  { name: "VAPI" },
  { name: "Bolna" },
  { name: "LiveKit" },
  { name: "Haptik" },
  { name: "OpenAI" },
  { name: "ElevenLabs" },
];

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
}

export function AuthLayout({ children, mode }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#ffffff' }}>
      {/* Left Side - Form */}
      <div 
        className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-20 py-12 min-h-screen overflow-visible"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="w-full max-w-[440px] px-4">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/stablr.svg"
                alt="STABLR"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {mode === "sign-in" ? "Welcome Back!" : "Create Account"}
            </h1>
            <p className="text-sm leading-relaxed">
              {mode === "sign-in" ? (
                <>
                  Sign in to access your{" "}
                  <span className="text-emerald-600">dashboard</span> and
                  continue optimizing your QA process.
                </>
              ) : (
                <>
                  Get started with STABLR and supercharge your{" "}
                  <span className="text-emerald-600">voice agent testing</span>.
                </>
              )}
            </p>
          </div>

          {/* Clerk Component */}
          <div className="w-full overflow-visible">{children}</div>

          {/* Footer Link */}
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="text-gray-900 font-medium underline hover:no-underline"
                >
                  Sign up here
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-gray-900 font-medium underline hover:no-underline"
                >
                  Sign in here
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0D3D3B] via-[#0A4744] to-[#063532] flex-col justify-between p-10 xl:p-12 relative overflow-hidden min-h-screen">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
          {/* Main Heading */}
          <h2 className="text-3xl xl:text-4xl font-semibold text-white leading-tight mb-6">
            Smarter QA for Voice and
            <br />
            Chat AI Agents
            <span className="text-emerald-400">*</span>
          </h2>

          {/* Testimonial */}
          <div className="mt-8">
            <blockquote className="text-white/80 text-lg italic mb-6 leading-relaxed">
              &ldquo;STABLR has completely transformed how we test
              conversational AI. It&apos;s fast, reliable, and gives us
              confidence before production.&rdquo;
            </blockquote>
            <div>
              <p className="text-white font-semibold">Michael Carter</p>
              <p className="text-white/60 text-sm">
                Software Engineer at DevCore
              </p>
            </div>
          </div>
        </div>

        {/* Trusted By Section */}
        <div className="relative z-10 mt-auto pt-8">
          <p className="text-white/50 text-sm mb-4 tracking-wide">
            Works with your favorite voice AI platforms
          </p>

          {/* Integration Logos Grid */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-3">
            {INTEGRATIONS.map((integration, index) => (
              <div
                key={`${integration.name}-${index}`}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/15 transition-colors">
                  <IntegrationIcon name={integration.name} />
                </div>
                <span className="text-xs font-medium hidden xl:inline whitespace-nowrap">
                  {integration.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
