import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { Features } from "@/components/landing/Features";
import { ProductDetails } from "@/components/landing/ProductDetails";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#0B0C10] selection:bg-[#5E6AD2]/30">
      <Navbar />
      <HeroSection />
      <TrustBar />
      <Features />
      <ProductDetails />
      <CTA />
      <Footer />
    </main>
  );
}
