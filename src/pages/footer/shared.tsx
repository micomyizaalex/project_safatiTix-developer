import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const SectionHeading: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}> = ({ eyebrow, title, description, center = false }) => (
  <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
    {eyebrow ? (
      <p className="mb-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0077B6]">
        {eyebrow}
      </p>
    ) : null}
    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
    {description ? <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{description}</p> : null}
  </div>
);

export const StatChip: React.FC<{
  label: string;
  value: string;
  tone?: 'primary' | 'secondary' | 'success';
}> = ({ label, value, tone = 'primary' }) => {
  const toneClasses = {
    primary: 'border-sky-200 bg-sky-50 text-[#0077B6]',
    secondary: 'border-amber-200 bg-amber-50 text-[#F4A261]',
    success: 'border-emerald-200 bg-emerald-50 text-[#27AE60]',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{label}</div>
    </div>
  );
};

export const InfoCard: React.FC<{
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent?: string;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, description, accent = '#0077B6', children }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
    {Icon ? (
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
        <Icon className="h-6 w-6" />
      </div>
    ) : null}
    <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    {children ? <div className="mt-4">{children}</div> : null}
  </div>
);

export const FaqAccordion: React.FC<{
  items: Array<{ id: string; question: string; answer: React.ReactNode }>;
}> = ({ items }) => {
  const [openId, setOpenId] = useState(items[0]?.id ?? '');

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpenId(open ? '' : item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-base font-semibold text-slate-900">{item.question}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-[#0077B6] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] px-5 pb-5' : 'grid-rows-[0fr] px-5'}`}>
              <div className="overflow-hidden text-sm leading-7 text-slate-600">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PolicySection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
    <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">{children}</div>
  </section>
);
