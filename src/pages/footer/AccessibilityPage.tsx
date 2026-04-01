import React from 'react';
import { Accessibility, CheckCircle2, Ear, Keyboard, ScanSearch, TextCursorInput } from 'lucide-react';
import { InfoCard, SectionHeading } from './shared';

const features = [
  { title: 'Keyboard navigation', text: 'Interactive elements can be reached and used without a mouse.', icon: Keyboard, accent: '#0077B6' },
  { title: 'Readable contrast', text: 'Brand colors are applied with enough contrast to stay legible.', icon: CheckCircle2, accent: '#27AE60' },
  { title: 'Screen-reader support', text: 'Semantic structure and labels support assistive technology.', icon: Accessibility, accent: '#F4A261' },
  { title: 'Text scaling friendly', text: 'Layouts are built to remain usable as text size grows.', icon: TextCursorInput, accent: '#0f5f8b' },
  { title: 'Clear focus states', text: 'Focus rings make interactions easier to follow on all devices.', icon: ScanSearch, accent: '#0077B6' },
  { title: 'Multimodal access', text: 'We design for users who rely on a mix of touch, keyboard, and assistive input.', icon: Ear, accent: '#27AE60' },
];

const AccessibilityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-slate-950 via-[#0b3250] to-[#0077B6] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">Accessibility</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Committed to a travel platform that works for more people.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
            We aim to make SafariTix usable, understandable, and navigable across a broad range of abilities and assistive technologies.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <SectionHeading eyebrow="Commitments" title="Features and practices that support inclusive travel access" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <InfoCard key={feature.title} icon={feature.icon} title={feature.title} description={feature.text} accent={feature.accent} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default AccessibilityPage;
