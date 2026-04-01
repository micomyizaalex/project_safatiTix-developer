import React from 'react';
import { PolicySection, SectionHeading } from './shared';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.3fr_0.7fr] lg:px-10">
        <aside className="sticky top-24 h-fit rounded-[2rem] bg-slate-950 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#F4A261]">Legal</p>
          <h1 className="mt-4 text-3xl font-black">Terms of Service</h1>
          <p className="mt-4 text-sm leading-7 text-white/75">Read the terms that govern account use, booking behavior, and platform access.</p>
        </aside>

        <div>
          <SectionHeading title="Clean legal layout with scannable sections" description="The right column stays focused on readable blocks so users can find the details they need quickly." />
          <div className="mt-8 space-y-6">
            <PolicySection title="Account use">
              <p>You agree to provide accurate information, keep your account secure, and use SafariTix in compliance with applicable laws and transport rules.</p>
            </PolicySection>
            <PolicySection title="Bookings and payments">
              <p>Ticket purchases are subject to route availability, operator confirmation, and successful payment processing. Pricing may change based on route demand and operator policy.</p>
            </PolicySection>
            <PolicySection title="Prohibited activity">
              <p>Users may not attempt fraud, abuse cancellation workflows, misuse tracking features, or interfere with the platform or another user's account.</p>
            </PolicySection>
            <PolicySection title="Changes to the service">
              <p>We may update features, workflows, and availability over time. Continued use of the platform means you accept the most recent version of these terms.</p>
            </PolicySection>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfServicePage;
