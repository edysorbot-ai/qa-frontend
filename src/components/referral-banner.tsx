"use client";

import { useEffect, useState } from "react";
import { Gift, CheckCircle, AlertCircle, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface ReferralBannerProps {
  code: string;
}

export function ReferralBanner({ code }: ReferralBannerProps) {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [credits, setCredits] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Store referral code in localStorage for use after signup
    localStorage.setItem("pending_referral_code", code.toUpperCase());

    // Validate the referral code
    const validateCode = async () => {
      try {
        const response = await fetch(`${API_URL}/referral/validate/${code}`);
        const data = await response.json();

        if (data.valid) {
          setStatus("valid");
          setCredits(data.refereeCredits || 0);
        } else {
          setStatus("invalid");
        }
      } catch (error) {
        console.error("Error validating referral code:", error);
        setStatus("invalid");
      }
    };

    validateCode();
  }, [code]);

  if (dismissed || status === "loading") return null;

  if (status === "invalid") {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">
          The referral code &quot;{code}&quot; is invalid or has expired.
        </span>
        <button onClick={() => setDismissed(true)} className="ml-2 hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-lg">
      <Gift className="w-5 h-5 flex-shrink-0" />
      <div className="text-sm">
        <span className="font-semibold">Referral code applied!</span>
        <span className="ml-1">Sign up now to receive {credits} bonus credits.</span>
      </div>
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
    </div>
  );
}
