import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReferralBanner } from "@/components/referral-banner";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { userId } = await auth();
  const params = await searchParams;
  const referralCode = params.ref;

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {referralCode && <ReferralBanner code={referralCode} />}
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-white">
          Voice Agent QA Platform
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Automated testing and quality assurance for voice agents. 
          Test ElevenLabs, Retell, VAPI, and OpenAI Realtime agents with one click.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/sign-in">
            <Button size="lg" variant="default">
              Sign In
            </Button>
          </Link>
          <Link href={referralCode ? `/sign-up?ref=${referralCode}` : "/sign-up"}>
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
