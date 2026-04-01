import React from 'react';
import { Clock3, MapPin, Ticket, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoCard, SectionHeading } from './shared';

const routes = [
  { from: 'Kigali', to: 'Musanze', price: 'From RWF 6,500', time: '2h 15m', note: 'Great for weekend trips to the northern province.' },
  { from: 'Kigali', to: 'Huye', price: 'From RWF 8,000', time: '3h 40m', note: 'Popular with students, visitors, and business travelers.' },
  { from: 'Kigali', to: 'Rubavu', price: 'From RWF 7,500', time: '3h 05m', note: 'A scenic route heading toward Lake Kivu.' },
  { from: 'Kigali', to: 'Nyagatare', price: 'From RWF 9,000', time: '4h 10m', note: 'Reliable service for the eastern corridor.' },
  { from: 'Kigali', to: 'Rusizi', price: 'From RWF 12,000', time: '6h 30m', note: 'Long-distance travel with scheduled rest stops.' },
  { from: 'Huye', to: 'Rusumo', price: 'From RWF 5,500', time: '2h 35m', note: 'Perfect for border-region connections.' },
];

const PopularRoutesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7fbfe]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b72a8] via-[#0077B6] to-[#0b3250] text-white">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(244,162,97,0.35),transparent_22%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.15),transparent_18%)]" />
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/85">Popular routes</p>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">The routes travelers ask for most, all in one place.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
                Compare origins, destinations, travel times, and placeholder prices before you book your next trip.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact" className="rounded-full bg-[#F4A261] px-6 py-3 font-semibold text-slate-900">Request a route</Link>
                <Link to="/help-center" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 font-semibold">Need help?</Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard icon={MapPin} title="Route reach" description="Passenger favorites from Kigali to every corner of the country." accent="#F4A261" />
              <InfoCard icon={Clock3} title="Time clarity" description="See approximate travel times before you commit to a seat." accent="#27AE60" />
              <InfoCard icon={Ticket} title="Flexible pricing" description="Use the placeholder fares as a quick comparison starting point." accent="#ffffff" />
              <InfoCard icon={TrendingUp} title="Demand signals" description="High-interest corridors get more frequent departures." accent="#c6f6d5" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <SectionHeading
          eyebrow="Travel grid"
          title="Compare bus routes at a glance"
          description="Each card highlights the direction, estimate, and route note so the page feels like a live planning board."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((route) => (
            <article key={`${route.from}-${route.to}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0077B6]">{route.from}</p>
                  <div className="mt-2 text-2xl font-black text-slate-900">→ {route.to}</div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#27AE60]">Available</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{route.note}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sky-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Price</div>
                  <div className="mt-1 text-lg font-bold text-[#0077B6]">{route.price}</div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Time</div>
                  <div className="mt-1 text-lg font-bold text-[#F4A261]">{route.time}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PopularRoutesPage;
