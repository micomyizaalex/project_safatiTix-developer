import React, { FormEvent } from 'react';
import { Mail, MapPin, PhoneCall, SendHorizontal } from 'lucide-react';
import { InfoCard, SectionHeading } from './shared';

const ContactUsPage: React.FC = () => {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <SectionHeading eyebrow="Contact us" title="A two-column contact experience with a built-in form and support panel." description="Use this page for direct messages, business inquiries, and support follow-up." />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={onSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0077B6]" placeholder="Your name" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input type="email" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0077B6]" placeholder="you@example.com" />
              </label>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">Message</span>
              <textarea rows={7} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0077B6]" placeholder="Tell us how we can help..." />
            </label>
            <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0077B6] px-6 py-3 font-semibold text-white">
              Send message <SendHorizontal className="h-4 w-4" />
            </button>
          </form>

          <div className="space-y-5">
            <InfoCard icon={PhoneCall} title="Call support" description="+250 793 216 602" accent="#27AE60" />
            <InfoCard icon={Mail} title="Email" description="info@safaritix.rw" accent="#0077B6" />
            <InfoCard icon={MapPin} title="Office location" description="Kigali, Rwanda" accent="#F4A261" />
            <div className="rounded-[2rem] bg-gradient-to-br from-[#0077B6] to-[#0b3250] p-6 text-white shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/75">Response promise</p>
              <p className="mt-3 text-lg leading-7 text-white/90">Our team aims to respond within one business day for general inquiries.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUsPage;
