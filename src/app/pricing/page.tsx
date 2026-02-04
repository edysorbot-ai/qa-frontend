import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0B0C10] selection:bg-[#5E6AD2]/30">
      <Navbar />
      <div className="pt-24">
        <Pricing />
      </div>
      <Footer />
    </main>
  );
}
