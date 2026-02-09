import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { BookingCalendar } from "@/components/booking/BookingCalendar";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-[#0B0C10] selection:bg-[#5E6AD2]/30">
      <Navbar />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#EEEEEE] mb-4">
            Book a Demo
          </h1>
          <p className="text-lg text-[#8A8F98]">
            Schedule a personalized demo to see how STABLR can help you test your AI voice agents.
          </p>
        </div>
        <BookingCalendar />
      </div>
      <Footer />
    </main>
  );
}
