import React from 'react';
import axios from 'axios';
import { AlertCircle, Building2, Check, Crown, Loader2, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { PLAN_PERMISSION_PRESETS, type SubscriptionPlan } from '../../utils/subscriptionPlans';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const PLAN_ORDER: SubscriptionPlan[] = ['Starter', 'Growth', 'Enterprise'];

type RequestStatus = 'pending' | 'approved' | 'rejected';

interface SubscriptionRequestRecord {
  id: string;
  currentPlan: SubscriptionPlan;
  requestedPlan: SubscriptionPlan;
  status: RequestStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CompanySubscriptionData {
  id: string;
  name: string;
  plan: SubscriptionPlan;
  subscriptionStatus: string;
  nextPayment: string | null;
  latestSubscriptionRequest?: SubscriptionRequestRecord | null;
}

interface DisplayPlan {
  plan: SubscriptionPlan;
  eyebrow: string;
  description: string;
  highlights: string[];
  maxDrivers: string;
  icon: React.ElementType;
}

const PLAN_DISPLAY: DisplayPlan[] = [
  {
    plan: 'Starter',
    eyebrow: 'For early-stage operators',
    description: 'A lightweight plan for companies running a smaller fleet and core daily operations.',
    highlights: ['Max buses: 5', 'Max drivers: 10', 'Basic analytics'],
    maxDrivers: '10',
    icon: Building2,
  },
  {
    plan: 'Growth',
    eyebrow: 'For scaling operators',
    description: 'Adds more fleet capacity, broader reporting, and faster support for expanding teams.',
    highlights: ['Max buses: 20', 'Max drivers: 50', 'Advanced analytics', 'Priority support'],
    maxDrivers: '50',
    icon: Rocket,
  },
  {
    plan: 'Enterprise',
    eyebrow: 'For large networks',
    description: 'Built for high-volume transport companies with enterprise-grade reporting and support.',
    highlights: ['Unlimited buses', 'Unlimited drivers', 'Full analytics', 'Dedicated support'],
    maxDrivers: 'Unlimited',
    icon: Crown,
  },
];

const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const getAuthConfig = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const formatDate = (value: string | null) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CompanySubscriptionManagement() {
  const [loading, setLoading] = React.useState(true);
  const [company, setCompany] = React.useState<CompanySubscriptionData | null>(null);
  const [latestRequest, setLatestRequest] = React.useState<SubscriptionRequestRecord | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<SubscriptionPlan | null>(null);
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadSubscriptionData = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const config = getAuthConfig();
      const [companyResponse, requestResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/company`, config),
        axios.get(`${API_BASE_URL}/company/subscription-request`, config),
      ]);

      const companyData = companyResponse.data.company || null;
      const latest = requestResponse.data.request || companyData?.latestSubscriptionRequest || null;

      setCompany(companyData);
      setLatestRequest(latest);
    } catch (error: any) {
      setLoadError(error.response?.data?.error || error.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  React.useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const currentPlan = company?.plan || 'Starter';
  const currentPlanDetails = PLAN_DISPLAY.find((entry) => entry.plan === currentPlan) || PLAN_DISPLAY[0];
  const currentPermissions = PLAN_PERMISSION_PRESETS[currentPlan];
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);

  const openRequestModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setRequestError(null);
  };

  const closeRequestModal = () => {
    if (submitting) return;
    setSelectedPlan(null);
    setRequestError(null);
  };

  const submitRequest = async () => {
    if (!selectedPlan) return;

    try {
      setSubmitting(true);
      setRequestError(null);

      const response = await axios.post(
        `${API_BASE_URL}/company/subscription-request`,
        { requested_plan: selectedPlan.toLowerCase() },
        getAuthConfig()
      );

      setLatestRequest(response.data.request || null);
      setFeedback(response.data.message || `Upgrade request submitted for ${selectedPlan}.`);
      setSelectedPlan(null);
    } catch (error: any) {
      setRequestError(error.response?.data?.error || error.message || 'Failed to submit upgrade request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0077B6]" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-black text-[#2B2D42]">Subscription</h1>
            <p className="mt-2 text-sm font-medium">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#0077B6]">Subscription</div>
          <h1 className="mt-2 text-3xl font-['Montserrat'] font-black text-[#2B2D42]">Company Subscription</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review your current SafariTix plan, compare available tiers, and send an upgrade request for admin approval.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <div className="font-semibold text-slate-900">Company</div>
          <div>{company?.name || 'SafariTix Company'}</div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="text-sm font-semibold">{feedback}</div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(0,119,182,0.16),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#0f766e_100%)] px-6 py-8 text-white lg:grid-cols-[1.25fr_0.9fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-100">
              <Sparkles className="h-4 w-4" />
              Current Plan
            </div>
            <h2 className="mt-4 text-3xl font-black font-['Montserrat']">{currentPlan}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 font-semibold text-emerald-100">
                Status: {statusLabel(company?.subscriptionStatus || 'active')}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-100">
                Next payment: {formatDate(company?.nextPayment || null)}
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-200">{currentPlanDetails.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Max buses</div>
                <div className="mt-2 text-2xl font-black">{currentPermissions.limits.maxBuses ?? 'Unlimited'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Max drivers</div>
                <div className="mt-2 text-2xl font-black">{currentPlanDetails.maxDrivers}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Plan support</div>
                <div className="mt-2 text-lg font-bold">{currentPermissions.features.prioritySupport ? 'Priority' : 'Standard'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Plan Limits</div>
            <div className="mt-4 space-y-3">
              {currentPlanDetails.highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-black/10 px-4 py-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                  <span className="text-sm text-slate-100">{item}</span>
                </div>
              ))}
            </div>

            {latestRequest && (
              <div className="mt-5 rounded-2xl border border-amber-200/40 bg-amber-400/10 px-4 py-4 text-sm text-amber-50">
                <div className="font-bold">Latest request</div>
                <div className="mt-1">
                  {latestRequest.currentPlan} to {latestRequest.requestedPlan} · {statusLabel(latestRequest.status)}
                </div>
                <div className="mt-1 text-xs text-amber-100/80">Requested on {formatDate(latestRequest.createdAt)}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-['Montserrat'] font-black text-[#2B2D42]">Pricing & Plans</h2>
            <p className="text-sm text-slate-600">Compare all available company tiers. Upgrade requests are reviewed by admin before plan changes are applied.</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {PLAN_DISPLAY.map((plan) => {
            const planPermissions = PLAN_PERMISSION_PRESETS[plan.plan];
            const isCurrentPlan = plan.plan === currentPlan;
            const isUpgrade = PLAN_ORDER.indexOf(plan.plan) > currentPlanIndex;
            const hasPendingRequest = latestRequest?.status === 'pending' && latestRequest.requestedPlan === plan.plan;
            const Icon = plan.icon;

            return (
              <article
                key={plan.plan}
                className={`relative overflow-hidden rounded-[28px] border bg-white p-6 shadow-sm transition-all ${
                  isCurrentPlan
                    ? 'border-[#0077B6] shadow-[0_20px_60px_rgba(0,119,182,0.12)] ring-1 ring-[#0077B6]/10'
                    : 'border-slate-200 hover:-translate-y-1 hover:shadow-lg'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute right-4 top-4 rounded-full bg-[#0077B6] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                    Current Plan
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#0077B6]">{plan.eyebrow}</div>
                    <h3 className="mt-3 text-2xl font-black text-[#2B2D42]">{plan.plan}</h3>
                  </div>
                  <div className={`rounded-2xl p-3 ${isCurrentPlan ? 'bg-[#0077B6] text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Max buses</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{planPermissions.limits.maxBuses ?? 'Unlimited'}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Max drivers</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{plan.maxDrivers}</div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {plan.highlights.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openRequestModal(plan.plan)}
                  disabled={isCurrentPlan || !isUpgrade || hasPendingRequest}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    isCurrentPlan
                      ? 'cursor-default bg-slate-100 text-slate-500'
                      : hasPendingRequest
                        ? 'cursor-not-allowed bg-amber-100 text-amber-700'
                        : !isUpgrade
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'bg-gradient-to-r from-[#0077B6] to-[#005F8E] text-white hover:shadow-lg'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : hasPendingRequest ? 'Request Pending' : 'Request Upgrade'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {selectedPlan && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-2xl font-black text-[#2B2D42]">Request Upgrade</h3>
              <p className="mt-2 text-sm text-slate-600">
                Send an upgrade request for the {selectedPlan} plan. Admin will review it and apply the plan change manually.
              </p>
            </div>

            <div className="space-y-4 px-6 py-6">
              {requestError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
                  {requestError}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-500">Current plan</span>
                  <span className="font-bold text-slate-900">{currentPlan}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-500">Requested plan</span>
                  <span className="font-bold text-slate-900">{selectedPlan}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={closeRequestModal}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#005F8E] px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}