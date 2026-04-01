import React from 'react';
import { ArrowRight, BriefcaseBusiness, Clock3, HeartHandshake, MapPin, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoCard, SectionHeading } from './shared';

const jobs = [
  { title: 'Frontend Engineer', location: 'Kigali', type: 'Full-time', summary: 'Build delightful booking and support experiences with React and Tailwind.' },
  { title: 'Product Designer', location: 'Hybrid', type: 'Full-time', summary: 'Shape end-to-end journeys for passengers, operators, and support agents.' },
  { title: 'Customer Support Specialist', location: 'Kigali', type: 'Shift-based', summary: 'Help users resolve booking questions and travel changes quickly.' },
];

const CareersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,162,97,0.28),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,119,182,0.36),transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div className="relative z-10">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Careers</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Help shape the future of travel operations.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
              We design for speed, clarity, and trust. If you care about meaningful product work, this is a strong place to grow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#F4A261] px-6 py-3 font-semibold text-slate-900">
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="rounded-full border border-white/15 bg-white/10 px-6 py-3 font-semibold text-white">Learn about SafariTix</Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon={Rocket} title="Mission-led" description="Work on a product that directly improves daily travel for thousands of people." accent="#F4A261" />
            <InfoCard icon={BriefcaseBusiness} title="Clear ownership" description="Small teams, fast decisions, and space to ship meaningful improvements." accent="#27AE60" />
            <InfoCard icon={Clock3} title="Flexible rhythm" description="We value focus time, healthy collaboration, and sustainable delivery." accent="#ffffff" />
            <InfoCard icon={HeartHandshake} title="Supportive culture" description="We want teammates who bring curiosity, empathy, and momentum." accent="#0ea5e9" />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <SectionHeading eyebrow="Open roles" title="Current opportunities" description="Each listing card is designed as a compact, action-driven block with a clear apply CTA." />
          <div className="mt-10 grid gap-6">
            {jobs.map((job) => (
              <article key={job.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-medium text-[#0077B6]">{job.type}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900">{job.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{job.summary}</p>
                  </div>
                  <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#0077B6] px-5 py-3 font-semibold text-white">
                    Apply <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CareersPage;
