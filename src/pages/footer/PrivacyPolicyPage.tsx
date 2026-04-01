import React from 'react';
import { LockKeyhole, ShieldCheck, UserRound, Workflow } from 'lucide-react';
import { InfoCard, PolicySection, SectionHeading } from './shared';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_48%,#eef6fb_100%)]">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <SectionHeading eyebrow="Privacy policy" title="A reassuring policy page with a visual commitment panel and text sections." description="We keep the design calm and readable so privacy details do not feel buried." />

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon={ShieldCheck} title="Data minimization" description="We collect only the information needed to book, support, and improve trips." accent="#27AE60" />
            <InfoCard icon={LockKeyhole} title="Security" description="Access to personal information is limited to authorized systems and teams." accent="#0077B6" />
            <InfoCard icon={UserRound} title="User control" description="You can review and update profile information where applicable." accent="#F4A261" />
            <InfoCard icon={Workflow} title="Operational use" description="We use data to fulfill bookings, send updates, and improve reliability." accent="#0f5f8b" />
          </div>

          <div className="space-y-6">
            <PolicySection title="Information we collect">
              <p>This may include account details, booking data, contact information, and device or usage data that helps us run the platform.</p>
            </PolicySection>
            <PolicySection title="How we use it">
              <p>We use information to provide tickets, notify you about trips, handle refunds, prevent abuse, and support customer requests.</p>
            </PolicySection>
            <PolicySection title="Sharing and retention">
              <p>We share data only with parties needed to complete the travel experience, such as operators and payment providers, and we retain it as required for service and legal purposes.</p>
            </PolicySection>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
