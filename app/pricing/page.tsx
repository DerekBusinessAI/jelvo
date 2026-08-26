import { PricingTable } from "@clerk/nextjs";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] px-6 py-16 text-[#171512]">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a9825a]">
            Studify
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">
            A Student's AI.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#746b61]">
            Choose the Studify experience that works best for you.
            Start free, then upgrade when you're ready for more.
          </p>
        </div>

        {/* PRICING TABLE */}
        <div className="mx-auto max-w-5xl">
          <PricingTable />
        </div>

        {/* FOOTER NOTE */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#9a8f83]">
            Secure billing. Cancel anytime.
          </p>
        </div>

      </div>
    </main>
  );
}