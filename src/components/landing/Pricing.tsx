"use client";

import { Container } from "./Container";
import { Button } from "./Button";
import { Check, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price_usd: number;
  is_unlimited: boolean;
  is_active: boolean;
  is_default: boolean;
  validity_days: number;
  features: string[];
  max_team_members: number;
}

export function Pricing() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/public/packages`);
        if (!response.ok) {
          throw new Error('Failed to fetch packages');
        }
        const data = await response.json();
        setPackages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // Find the most popular/recommended package (the one marked as default or middle tier)
  const getPopularIndex = () => {
    const defaultIndex = packages.findIndex(pkg => pkg.is_default);
    if (defaultIndex !== -1) return defaultIndex;
    // If no default, pick the middle one
    return Math.floor(packages.length / 2);
  };

  const formatCredits = (credits: number, isUnlimited: boolean) => {
    if (isUnlimited) return "Unlimited";
    if (credits >= 1000) return `${(credits / 1000).toFixed(0)}K`;
    return credits.toString();
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$${price}`;
  };

  const formatValidity = (days: number) => {
    if (days === 0) return "";
    if (days === 30) return "/month";
    if (days === 365) return "/year";
    return `/${days} days`;
  };

  if (loading) {
    return (
      <section id="pricing" className="py-24 relative overflow-hidden">
        <Container>
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-10 w-64 bg-[#1A1B1E] rounded mx-auto mb-4" />
              <div className="h-6 w-96 bg-[#1A1B1E] rounded mx-auto" />
            </div>
          </div>
        </Container>
      </section>
    );
  }

  if (error || packages.length === 0) {
    return null; // Don't show pricing section if no packages
  }

  const popularIndex = getPopularIndex();

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#5E6AD2] opacity-[0.08] blur-[150px] rounded-full pointer-events-none" />

      <Container className="relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5E6AD2]/10 text-[#5E6AD2] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Simple Pricing
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-[#EEEEEE] mb-4"
          >
            Choose Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-[#A0A8F0]">
              Testing Plan
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-[#8A8F98]"
          >
            Start testing your AI voice agents today. Scale as you grow.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className={`grid gap-8 ${
          packages.length === 1 ? 'max-w-md mx-auto' :
          packages.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
          packages.length === 3 ? 'md:grid-cols-3' :
          'md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {packages.map((pkg, index) => {
            const isPopular = index === popularIndex;
            
            // Convert features object to readable list
            const formatFeatureKey = (key: string): string => {
              const featureLabels: Record<string, string> = {
                agents: "Agent Management",
                test_runs: "Test Runs",
                test_cases: "Test Cases",
                workflows: "Workflow Automation",
                scheduling: "Scheduled Tests",
                unlimited: "Unlimited Usage",
                export_data: "Data Export",
                agent_create: "Create Agents",
                schedule_run: "Run Schedules",
                workflow_run: "Run Workflows",
                test_run_chat: "Chat Testing",
                test_run_batch: "Batch Testing",
                test_run_voice: "Voice Testing",
                compare_prompts: "Prompt Comparison",
                report_generate: "Report Generation",
                schedule_create: "Create Schedules",
                team_member_add: "Team Management",
                workflow_create: "Create Workflows",
                integration_sync: "Integration Sync",
                test_case_create: "Create Test Cases",
                test_case_delete: "Delete Test Cases",
                test_case_update: "Update Test Cases",
                compare_test_runs: "Compare Test Runs",
                prompt_suggestion: "AI Prompt Suggestions",
                custom_agent_create: "Custom Agents",
                integration_connect: "Connect Integrations",
                test_run_concurrent: "Concurrent Tests",
                agent_simulation_chat: "Chat Simulation",
                test_case_bulk_create: "Bulk Test Creation",
                agent_simulation_voice: "Voice Simulation",
              };
              return featureLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            };

            const getFeaturesList = (): string[] => {
              const featuresList: string[] = [];
              const featuresObj = typeof pkg.features === 'string' 
                ? JSON.parse(pkg.features) 
                : pkg.features || {};
              
              // Add max_agents as a feature if present
              if (featuresObj.max_agents) {
                featuresList.push(`Up to ${featuresObj.max_agents} agents`);
              }
              
              // Add key features (excluding max_agents and boolean false values)
              const priorityFeatures = ['test_runs', 'test_cases', 'scheduling', 'workflows', 'unlimited'];
              for (const key of priorityFeatures) {
                if (featuresObj[key] === true) {
                  featuresList.push(formatFeatureKey(key));
                }
              }
              
              // Add other true features
              for (const [key, value] of Object.entries(featuresObj)) {
                if (value === true && !priorityFeatures.includes(key) && key !== 'agents') {
                  if (featuresList.length < 6) { // Limit to 6 features per card
                    featuresList.push(formatFeatureKey(key));
                  }
                }
              }
              
              return featuresList;
            };

            const featuresList = getFeaturesList();

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                className={`
                  relative p-8 rounded-2xl border flex flex-col bg-[#0B0C10]/80 backdrop-blur-sm
                  ${isPopular
                    ? "border-[#5E6AD2] shadow-[0_0_40px_-10px_rgba(94,106,210,0.3)]"
                    : "border-[#2A2A2A] hover:border-[#5E6AD2]/40 transition-colors"
                  }
                `}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#5E6AD2] text-white text-xs font-medium rounded-full flex items-center gap-1 shadow-lg shadow-[#5E6AD2]/20">
                    <Zap className="w-3 h-3" />
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-[#EEEEEE] mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(pkg.price_usd)}
                    </span>
                    {pkg.price_usd > 0 && (
                      <span className="text-[#8A8F98]">{formatValidity(pkg.validity_days)}</span>
                    )}
                  </div>
                  <p className="text-[#8A8F98] text-sm">{pkg.description}</p>
                </div>

                {/* Credits Badge */}
                <div className="mb-6 p-3 bg-[#1A1B1E] rounded-lg">
                  <div className="text-sm text-[#8A8F98] mb-1">Test Credits</div>
                  <div className="text-2xl font-bold text-[#EEEEEE]">
                    {formatCredits(pkg.credits, pkg.is_unlimited)}
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-1 space-y-3 mb-6">
                  {pkg.max_team_members >= 1 && (
                    <div className="flex items-start gap-3 text-sm text-[#CCCCCC]">
                      <Check className="w-4 h-4 text-[#5E6AD2] mt-0.5 shrink-0" />
                      {pkg.max_team_members === 1 ? '1 team member' : `Up to ${pkg.max_team_members} team members`}
                    </div>
                  )}
                  {featuresList.map((feature: string, featureIndex: number) => (
                    <div key={featureIndex} className="flex items-start gap-3 text-sm text-[#CCCCCC]">
                      <Check className="w-4 h-4 text-[#5E6AD2] mt-0.5 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  variant={isPopular ? "primary" : "secondary"}
                  className="w-full justify-center"
                  asChild
                >
                  <Link href="/signup">
                    {pkg.price_usd === 0 ? "Get Started Free" : "Get Started"}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center text-sm text-[#8A8F98] mt-12"
        >
          All plans include API access, detailed test reports, and audio recordings.
          <br />
          Need a custom plan? <a href="mailto:support@stablr.ai" className="text-[#5E6AD2] hover:underline">Contact us</a>
        </motion.p>
      </Container>
    </section>
  );
}
