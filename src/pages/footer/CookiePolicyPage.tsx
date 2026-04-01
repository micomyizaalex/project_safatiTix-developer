import React from 'react';
import { Cookie, Gauge, SlidersHorizontal, TimerReset } from 'lucide-react';
import { PolicySection, SectionHeading } from './shared';

const CookiePolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
        <SectionHeading eyebrow="Cookie policy" title="Simple explanations for essential, functional, and analytics cookies." description="The layout uses readable blocks and a feature table style to make the categories clear." />

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white">
            <Cookie className="h-8 w-8 text-[#F4A261]" />
            <h2 className="mt-4 text-2xl font-bold">Why we use cookies</h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Cookies help keep your session active, remember preferences, and measure product performance so we can improve the experience.
            </p>
          </div>

          <div className="space-y-5">
            <PolicySection title="Essential cookies">
              <p>Required for navigation, login, and secure booking workflows.</p>
            </PolicySection>
            <PolicySection title="Functional cookies">
              <p>Remember preferences such as language, region, or saved traveler details where supported.</p>
            </PolicySection>
            <PolicySection title="Analytics cookies">
              <p>Help us understand how users move through the platform so we can improve the experience.</p>
            </PolicySection>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <SlidersHorizontal className="h-6 w-6 text-[#0077B6]" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Preference controls</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <Gauge className="h-6 w-6 text-[#27AE60]" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Performance insights</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <TimerReset className="h-6 w-6 text-[#F4A261]" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Session handling</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CookiePolicyPage;
