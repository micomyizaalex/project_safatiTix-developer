import React from 'react';
import { MessageCircleQuestion, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaqAccordion, SectionHeading } from './shared';

const FAQS = [
  {
    id: 'booking',
    question: 'How do I book a ticket?',
    answer: 'Search for your route, pick a departure time, choose a seat, complete payment, and keep the digital ticket in your account or inbox.',
  },
  {
    id: 'cancellation',
    question: 'How do cancellations work?',
    answer: 'Cancellation rules depend on the route and departure window. Head to the cancellation policy page for the full breakdown and timing rules.',
  },
  {
    id: 'tracking',
    question: 'Can I track my bus after booking?',
    answer: 'Yes. Once your trip is confirmed, you can follow the status and tracking details from your booking or trip page.',
  },
  {
    id: 'refunds',
    question: 'How long do refunds take?',
    answer: 'Refund timing depends on the payment method. In most cases, funds are processed back after the cancellation request is approved.',
  },
];

const FAQsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_55%,#eef6fb_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">FAQs</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight">Straight answers for common traveler questions.</h1>
            <p className="mt-5 text-base leading-7 text-white/75">
              This page uses an expandable accordion as the main interaction pattern to keep browsing simple on mobile and desktop.
            </p>
            <div className="mt-8 rounded-2xl bg-white/5 p-5">
              <MessageCircleQuestion className="h-8 w-8 text-[#F4A261]" />
              <p className="mt-4 text-sm leading-7 text-white/80">
                Need a person? Use the help center or contact page to reach the support team.
              </p>
              <Link to="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F4A261] px-5 py-3 font-semibold text-slate-900">
                Contact support <PhoneCall className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div>
            <SectionHeading eyebrow="Questions" title="Expandable answers" description="A clean accordion makes it easy to scan, expand, and collapse topics." />
            <div className="mt-8">
              <FaqAccordion items={FAQS} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQsPage;
