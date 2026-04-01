import React from 'react';
import { BadgeCheck, BusFront, Landmark, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoCard, SectionHeading } from './shared';

const operators = [
  { name: 'Volcano Express', region: 'Northern corridor', summary: 'Reliable intercity connections with strong daytime frequency and airport links.' },
  { name: 'Kivu Transit', region: 'Western routes', summary: 'Comfort-focused departures around Lake Kivu and the border belt.' },
  { name: 'Umutekano Coaches', region: 'Southern network', summary: 'Trusted for student travel, scheduled departures, and easy seat management.' },
  { name: 'Eastern Link', region: 'Eastern corridor', summary: 'Fast-moving services connecting Kigali with Nyagatare and surrounding towns.' },
];

const BusOperatorsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div className="rounded-[2rem] bg-[linear-gradient(145deg,#eef8ff,#ffffff)] p-8 shadow-sm">
          <p className="inline-flex rounded-full bg-sky-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#0077B6]">Bus operators</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900">A partner showcase built for trust and discovery.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            This page spotlights operator logos, regions served, and short descriptions so passengers can quickly understand who runs each trip.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/careers" className="rounded-full bg-[#0077B6] px-6 py-3 font-semibold text-white">Join the team</Link>
            <Link to="/contact" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-900">Partner with us</Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard icon={BusFront} title="Verified fleet" description="Partner operators are presented with simple, recognizable logo placeholders and route coverage tags." accent="#0077B6" />
          <InfoCard icon={ShieldCheck} title="Trusted partners" description="Clear ownership and service information helps passengers choose with confidence." accent="#27AE60" />
          <InfoCard icon={BadgeCheck} title="Quality checks" description="Transparent labels support a better experience for riders and operators alike." accent="#F4A261" />
          <InfoCard icon={Landmark} title="Regional reach" description="Operators are grouped to show how SafariTix covers the country." accent="#0f5f8b" />
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <SectionHeading eyebrow="Partner network" title="Meet the operators on the platform" description="Each card uses a logo placeholder and concise copy to keep the layout clean and distinct." />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {operators.map((operator, index) => (
              <article key={operator.name} className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#0b3250] text-lg font-black text-white">
                  {operator.name
                    .split(' ')
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F4A261]">Operator {index + 1}</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">{operator.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[#0077B6]">{operator.region}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{operator.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusOperatorsPage;
