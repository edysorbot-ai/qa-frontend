"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Video, 
  Globe, 
  Calendar,
  User,
  Mail,
  MessageSquare,
  ArrowLeft,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Building2
} from "lucide-react";
import { api } from "@/lib/api";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
}

interface BookingFormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

interface BookingResult {
  booking: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: string;
    google_meet_link: string | null;
    email_sent: boolean;
  };
  meetLink: string | null;
  emailSent: boolean;
  message: string;
}

export function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTimeDisplay, setSelectedTimeDisplay] = useState<string | null>(null);
  const [step, setStep] = useState<"calendar" | "form" | "confirmed">("calendar");
  const [is24Hour, setIs24Hour] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API-driven state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get calendar days for current month view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }
    
    return days;
  }, [currentMonth, currentYear]);

  // Fetch available time slots when a date is selected
  const fetchAvailableSlots = useCallback(async (date: Date) => {
    setLoadingSlots(true);
    setError(null);
    setTimeSlots([]);
    setSelectedTime(null);
    setSelectedTimeDisplay(null);

    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const response = await fetch(api.endpoints.booking.availability(dateStr));
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch availability');
      }

      const data = await response.json();
      setTimeSlots(data.slots || []);
    } catch (err: unknown) {
      console.error('Failed to fetch slots:', err);
      setError('Failed to load available times. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, fetchAvailableSlots]);

  const isDateSelectable = (date: Date | null) => {
    if (!date) return false;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly >= today;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentYear, currentMonth + direction, 1));
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][selectedDate.getDay()];
    return `${dayName} ${selectedDate.getDate().toString().padStart(2, "0")}`;
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedTime(slot.time);
    setSelectedTimeDisplay(slot.display);
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      setStep("form");
      setError(null);
    }
  };

  const handleBack = () => {
    setStep("calendar");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!selectedDate || !selectedTime) {
        throw new Error('Please select a date and time');
      }

      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

      const response = await fetch(api.endpoints.booking.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          message: formData.message || undefined,
          date: dateStr,
          time: selectedTime,
          timezone: 'Asia/Kolkata',
          duration: 60,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      setBookingResult(data);
      setStep("confirmed");
    } catch (err: unknown) {
      console.error('Booking failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#0F1015] rounded-2xl border border-[#2A2A2A] overflow-hidden shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === "confirmed" ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-[#EEEEEE] mb-3">Booking Confirmed!</h2>
              <p className="text-[#8A8F98] mb-6">
                Your demo has been scheduled for{" "}
                <span className="text-[#EEEEEE]">
                  {selectedDate?.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>{" "}
                at <span className="text-[#EEEEEE]">{selectedTimeDisplay || selectedTime}</span>
              </p>

              {/* Google Meet Link */}
              {bookingResult?.meetLink && (
                <div className="bg-[#1A1B1E] border border-[#5E6AD2]/30 rounded-xl p-6 mb-6 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2 text-[#5E6AD2] mb-3">
                    <Video className="w-5 h-5" />
                    <span className="font-semibold">Google Meet Link</span>
                  </div>
                  <a
                    href={bookingResult.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-[#5E6AD2]/20"
                  >
                    <Video className="w-4 h-4" />
                    Join Meeting
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[#8A8F98] text-xs mt-3 break-all">
                    {bookingResult.meetLink}
                  </p>
                </div>
              )}

              {/* Email confirmation */}
              <div className="flex items-center justify-center gap-2 text-[#8A8F98] text-sm">
                {bookingResult?.emailSent ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Confirmation email sent to <span className="text-[#5E6AD2]">{formData.email}</span></span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>A confirmation email will be sent to <span className="text-[#5E6AD2]">{formData.email}</span></span>
                  </>
                )}
              </div>

              {bookingResult?.booking?.id && (
                <p className="text-[#5A5A5A] text-xs mt-4">
                  Booking ID: {bookingResult.booking.id}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="booking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row"
            >
              {/* Left Sidebar - Meeting Info */}
              <div className="lg:w-72 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-[#2A2A2A] bg-[#0B0C10]">
                {step === "form" && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-[#8A8F98] hover:text-[#EEEEEE] transition-colors mb-6 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                
                <h3 className="text-xl font-bold text-[#EEEEEE] mb-2">STABLR Demo</h3>
                
                <div className="flex items-center gap-2 text-[#8A8F98] mb-6">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">60 min</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[#8A8F98]">
                    <Video className="w-4 h-4 text-[#5E6AD2]" />
                    <span className="text-sm">Google Meet</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[#8A8F98]">
                    <Globe className="w-4 h-4 text-[#5E6AD2]" />
                    <span className="text-sm">Asia/Kolkata</span>
                  </div>

                  {selectedDate && selectedTime && (
                    <div className="flex items-center gap-3 text-[#EEEEEE] pt-4 border-t border-[#2A2A2A]">
                      <Calendar className="w-4 h-4 text-[#5E6AD2]" />
                      <span className="text-sm">
                        {selectedDate.toLocaleDateString("en-US", { 
                          weekday: "short",
                          month: "short", 
                          day: "numeric" 
                        })}, {selectedTimeDisplay || selectedTime}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
                  <p className="text-sm text-[#8A8F98] leading-relaxed">
                    Book a personalized demo to see how STABLR can help you automate testing for your AI voice agents.
                  </p>
                </div>
              </div>

              {step === "calendar" ? (
                <>
                  {/* Center - Calendar */}
                  <div className="flex-1 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-semibold text-[#EEEEEE]">
                        {MONTHS[currentMonth]} {currentYear}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigateMonth(-1)}
                          className="p-2 rounded-lg hover:bg-[#1A1B1E] transition-colors text-[#8A8F98] hover:text-[#EEEEEE]"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => navigateMonth(1)}
                          className="p-2 rounded-lg hover:bg-[#1A1B1E] transition-colors text-[#8A8F98] hover:text-[#EEEEEE]"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS.map(day => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-[#8A8F98] py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date, index) => {
                        const selectable = isDateSelectable(date);
                        const selected = isDateSelected(date);
                        const todayDate = isToday(date);

                        return (
                          <button
                            key={index}
                            disabled={!selectable}
                            onClick={() => date && setSelectedDate(date)}
                            className={`
                              aspect-square rounded-lg text-sm font-medium transition-all duration-200
                              flex items-center justify-center
                              ${!date ? "invisible" : ""}
                              ${selected 
                                ? "bg-[#EEEEEE] text-[#0B0C10]" 
                                : selectable 
                                  ? "bg-[#1A1B1E] text-[#EEEEEE] hover:bg-[#2A2A2A] cursor-pointer" 
                                  : "text-[#3A3A3A] cursor-not-allowed"
                              }
                              ${todayDate && !selected ? "ring-1 ring-[#5E6AD2]" : ""}
                            `}
                          >
                            {date?.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right - Time Slots (API-driven) */}
                  <div className="lg:w-64 p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-semibold text-[#EEEEEE]">
                        {selectedDate ? formatSelectedDate() : "Select Date"}
                      </h4>
                      <div className="flex items-center bg-[#1A1B1E] rounded-lg p-0.5 text-xs">
                        <button
                          onClick={() => setIs24Hour(false)}
                          className={`px-2 py-1 rounded-md transition-colors ${
                            !is24Hour ? "bg-[#2A2A2A] text-[#EEEEEE]" : "text-[#8A8F98]"
                          }`}
                        >
                          12h
                        </button>
                        <button
                          onClick={() => setIs24Hour(true)}
                          className={`px-2 py-1 rounded-md transition-colors ${
                            is24Hour ? "bg-[#2A2A2A] text-[#EEEEEE]" : "text-[#8A8F98]"
                          }`}
                        >
                          24h
                        </button>
                      </div>
                    </div>

                    {selectedDate ? (
                      loadingSlots ? (
                        <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                          <Loader2 className="w-6 h-6 text-[#5E6AD2] animate-spin" />
                          <span className="text-[#8A8F98] text-sm">Loading available times...</span>
                        </div>
                      ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-center">
                          <AlertCircle className="w-6 h-6 text-red-400" />
                          <span className="text-red-400 text-sm">{error}</span>
                          <button
                            onClick={() => selectedDate && fetchAvailableSlots(selectedDate)}
                            className="text-[#5E6AD2] text-sm hover:underline"
                          >
                            Try again
                          </button>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-center">
                          <Calendar className="w-6 h-6 text-[#5A5A5A]" />
                          <span className="text-[#8A8F98] text-sm">No available slots for this day</span>
                          <span className="text-[#5A5A5A] text-xs">Try selecting a different date</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {timeSlots.map(slot => {
                            const displayTime = is24Hour ? slot.time : slot.display;
                            const isSelected = selectedTime === slot.time;

                            return (
                              <button
                                key={slot.time}
                                onClick={() => handleTimeSelect(slot)}
                                disabled={!slot.available}
                                className={`
                                  w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200
                                  border
                                  ${isSelected
                                    ? "bg-[#5E6AD2] border-[#5E6AD2] text-white"
                                    : slot.available
                                      ? "bg-transparent border-[#2A2A2A] text-[#EEEEEE] hover:border-[#5E6AD2] hover:bg-[#5E6AD2]/10"
                                      : "bg-[#1A1B1E]/50 border-[#1A1B1E] text-[#3A3A3A] cursor-not-allowed line-through"
                                  }
                                `}
                              >
                                {displayTime}
                                {!slot.available && (
                                  <span className="text-xs ml-2 no-underline">(booked)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-[#8A8F98] text-sm">
                        Please select a date first
                      </div>
                    )}

                    {selectedDate && selectedTime && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleContinue}
                        className="w-full mt-6 py-3 px-4 bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-[#5E6AD2]/20"
                      >
                        Continue
                      </motion.button>
                    )}
                  </div>
                </>
              ) : (
                /* Form Step */
                <div className="flex-1 p-6 lg:p-8">
                  <h4 className="text-lg font-semibold text-[#EEEEEE] mb-6">
                    Enter Your Details
                  </h4>

                  {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm text-[#8A8F98] mb-2">
                        <User className="w-4 h-4" />
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#1A1B1E] border border-[#2A2A2A] rounded-xl text-[#EEEEEE] placeholder-[#5A5A5A] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-[#8A8F98] mb-2">
                        <Mail className="w-4 h-4" />
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#1A1B1E] border border-[#2A2A2A] rounded-xl text-[#EEEEEE] placeholder-[#5A5A5A] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                        placeholder="you@company.com"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-[#8A8F98] mb-2">
                        <Building2 className="w-4 h-4" />
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#1A1B1E] border border-[#2A2A2A] rounded-xl text-[#EEEEEE] placeholder-[#5A5A5A] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-[#8A8F98] mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Additional Notes
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#1A1B1E] border border-[#2A2A2A] rounded-xl text-[#EEEEEE] placeholder-[#5A5A5A] focus:outline-none focus:border-[#5E6AD2] transition-colors resize-none"
                        placeholder="Tell us about your use case..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-[#5E6AD2]/20 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        "Schedule Demo"
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1A1B1E;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3A3A3A;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4A4A4A;
        }
      `}</style>
    </div>
  );
}
