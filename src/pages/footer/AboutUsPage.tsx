import React from 'react';
import { ArrowRight, Award, Globe2, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoCard, SectionHeading, StatChip } from './shared';

const AboutUsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0077B6] via-[#0f5f8b] to-[#08324a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,162,97,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(39,174,96,0.18),transparent_22%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div className="relative z-10">
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/85">
              About SafariTix
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Building a calmer, smarter way to move across Rwanda.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
              SafariTix connects passengers and operators with modern ticketing, live tracking, and reliable customer support.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/routes" className="inline-flex items-center gap-2 rounded-full bg-[#F4A261] px-6 py-3 font-semibold text-slate-900 transition hover:brightness-105">
                Explore routes <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/15">
                Talk to us
              </Link>
            </div>
          </div>

          <div className="relative z-10 grid gap-4 sm:grid-cols-2">
            <StatChip label="Active operators" value="200+" tone="secondary" />
            <StatChip label="Daily bookings" value="15K+" tone="success" />
            <StatChip label="Passenger satisfaction" value="98%" tone="primary" />
            <StatChip label="Cities covered" value="30+" tone="secondary" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <SectionHeading
          eyebrow="Our story"
          title="Mission, vision, and the story behind the platform"
          description="We built SafariTix to remove the friction of station queues, paper tickets, and guesswork around bus travel."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <InfoCard icon={HeartHandshake} title="Mission" description="Make bus travel easy to book, easy to trust, and easy to manage for every traveler and operator." accent="#0077B6" />
          <InfoCard icon={Sparkles} title="Vision" description="Create the most dependable digital mobility layer for everyday journeys across East Africa." accent="#F4A261" />
          <InfoCard icon={ShieldCheck} title="Story" description="SafariTix began with a simple idea: passengers deserve a safer booking experience and operators deserve more predictable demand." accent="#27AE60" />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#F4A261]">Impact at a glance</p>
            <h2 className="mt-3 text-3xl font-bold">We measure success by the journeys we simplify.</h2>
            <div className="mt-8 space-y-4">
              {[
                'Faster booking for commuters who need to travel often.',
                'Better occupancy for operators with live seat visibility.',
                'Lower friction for support teams handling cancellations and rebookings.',
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-white/5 p-4">
                  <Award className="mt-1 h-5 w-5 shrink-0 text-[#F4A261]" />
                  <p className="text-sm leading-6 text-white/85">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon={Globe2} title="National reach" description="A growing network of routes connecting major cities and regional towns with one booking flow." accent="#0077B6" />
            <InfoCard icon={Award} title="Trust first" description="We design every page and policy around clarity, transparency, and traveler confidence." accent="#27AE60" />
            <InfoCard icon={HeartHandshake} title="Human support" description="Our support team helps passengers, operators, and drivers when plans change." accent="#F4A261" />
            <InfoCard icon={Sparkles} title="Product focus" description="We keep improving the booking experience using feedback from the people who rely on it daily." accent="#0f5f8b" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;
