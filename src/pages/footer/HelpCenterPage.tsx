import React from 'react';
import { ArrowRight, BookOpen, Headphones, Search, Ticket, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoCard, SectionHeading } from './shared';

const topics = [
  { title: 'Booking and tickets', icon: Ticket, text: 'Learn how to search routes, reserve seats, and manage confirmations.' },
  { title: 'Payments and refunds', icon: WalletCards, text: 'Get guidance on mobile money, cards, and refund timing.' },
  { title: 'Travel and tracking', icon: BookOpen, text: 'Understand live tracking, boarding, and trip status updates.' },
  { title: 'Account support', icon: Headphones, text: 'Find help with login, profile settings, and notifications.' },
];

const HelpCenterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef6fb_100%)]">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0077B6] via-[#0a5f8c] to-[#08324a] p-8 text-white shadow-2xl">
          <SectionHeading eyebrow="Help center" title="Search answers fast, then jump into the right topic." description="This page combines a prominent search UI with topic cards for a support-first experience." />
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <label className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
              <Search className="h-5 w-5 text-white/80" />
              <input
                type="text"
                placeholder="Search for booking, payment, cancellation, or account help"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/55 outline-none"
              />
            </label>
            <Link to="/faqs" className="inline-flex items-center justify-between rounded-2xl bg-[#F4A261] px-5 py-4 font-semibold text-slate-900">
              Browse FAQs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {topics.map((topic) => (
            <InfoCard key={topic.title} icon={topic.icon} title={topic.title} description={topic.text} accent="#0077B6" />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HelpCenterPage;
