import React from 'react';
import { Clock3, CircleSlash2, RefreshCw, TicketX } from 'lucide-react';
import { PolicySection, SectionHeading } from './shared';

const CancellationPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
        <SectionHeading eyebrow="Cancellation policy" title="Structured rules that are easy to read, scan, and understand." description="This page uses section blocks and a concise timeline so travelers can quickly see how changes are handled." />

        <div className="mt-10 grid gap-6">
          <PolicySection title="1. Cancellation windows">
            <p>Passengers may cancel tickets before the departure window shown on the trip page. Some routes allow cancellations up to a short time before departure, while others require earlier notice.</p>
          </PolicySection>
          <PolicySection title="2. Refund processing">
            <p>Approved refunds are returned to the original payment method or wallet, depending on the channel used during checkout.</p>
          </PolicySection>
          <PolicySection title="3. No-show rules">
            <p>If a passenger does not board the bus and no cancellation is submitted in time, the ticket may be marked as used or non-refundable.</p>
          </PolicySection>
          <PolicySection title="4. Operator exceptions">
            <p>Some operators may apply route-specific rules where advance notice, seat type, or promotional pricing changes the cancellation terms.</p>
          </PolicySection>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-sky-50 p-5">
            <Clock3 className="h-6 w-6 text-[#0077B6]" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Timing matters</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5">
            <TicketX className="h-6 w-6 text-[#F4A261]" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Seat status updates</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5">
            <RefreshCw className="h-6 w-6 text-[#27AE60]" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Rebooking options</p>
          </div>
          <div className="rounded-2xl bg-slate-900 p-5 text-white">
            <CircleSlash2 className="h-6 w-6 text-white" />
            <p className="mt-3 text-sm font-semibold">Final sales may apply</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CancellationPolicyPage;
