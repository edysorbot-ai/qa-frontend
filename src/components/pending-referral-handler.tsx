"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Gift, CheckCircle, X, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

export function PendingReferralHandler() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [status, setStatus] = useState<"checking" | "applying" | "success" | "error" | "none">("checking");
  const [message, setMessage] = useState("");
  const [creditsAwarded, setCreditsAwarded] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const applyPendingReferral = async () => {
      const pendingCode = localStorage.getItem("pending_referral_code");
      
      if (!pendingCode) {
        setStatus("none");
        return;
      }

      // Check if we've already SUCCESSFULLY applied this code (not just attempted)
      const successfulCodes = JSON.parse(localStorage.getItem("successful_referral_codes") || "[]");
      if (successfulCodes.includes(pendingCode)) {
        localStorage.removeItem("pending_referral_code");
        setStatus("none");
        return;
      }

      setStatus("applying");
      setShowBanner(true);

      try {
        const token = await getToken();
        if (!token) {
          setStatus("error");
          setMessage("Authentication failed");
          return;
        }

        const response = await fetch(`${API_URL}/users/referral/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ code: pendingCode })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Only mark as successful if it actually worked
          successfulCodes.push(pendingCode);
          localStorage.setItem("successful_referral_codes", JSON.stringify(successfulCodes));
          localStorage.removeItem("pending_referral_code");
          
          setStatus("success");
          setCreditsAwarded(data.creditsAwarded || 0);
          setMessage(data.message || `You received ${data.creditsAwarded} bonus credits!`);
        } else {
          // Don't show error for "already used" - just dismiss silently
          if (data.error?.includes("already used")) {
            localStorage.removeItem("pending_referral_code");
            setShowBanner(false);
            setStatus("none");
          } else {
            setStatus("error");
            setMessage(data.error || "Failed to apply referral code");
            // Don't remove pending code on error - allow retry on next page load
          }
        }
      } catch (error) {
        console.error("Error applying referral code:", error);
        setStatus("error");
        setMessage("Failed to apply referral code");
      }
    };

    applyPendingReferral();
  }, [isLoaded, isSignedIn, getToken]);

  if (!showBanner || status === "none" || status === "checking") return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg animate-in fade-in slide-in-from-top-4 duration-300">
      {status === "applying" && (
        <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Applying your referral bonus...</span>
        </div>
      )}

      {status === "success" && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
          <Gift className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold flex items-center gap-2">
              Referral Bonus Applied! <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-sm opacity-90">{message}</div>
          </div>
          <button onClick={() => setShowBanner(false)} className="hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span className="text-sm">{message}</span>
          <button onClick={() => setShowBanner(false)} className="hover:opacity-70 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
