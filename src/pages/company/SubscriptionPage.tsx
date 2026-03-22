import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { Star, Check, CreditCard, Calendar, AlertCircle, Bus, Users, TrendingUp, Zap, BarChart3, Headphones, Globe, Shield, Settings } from 'lucide-react';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  targetSize: string;
  busLimit: string;
  features: string[];
  popular?: boolean;
  icon: any;
}

interface CurrentSubscription {
  plan: string;
  status: 'active' | 'inactive' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  amount: number;
}

export default function Subscription() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API call
      const mockData: CurrentSubscription = {
        plan: 'Growth',
        status: 'active',
        startDate: '2024-01-15',
        endDate: '2026-04-15',
        autoRenew: true,
        amount: 150000,
      };
      
      setCurrentPlan(mockData);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 50000,
      description: 'Perfect for small operators just getting started',
      targetSize: 'Small operators (1-5 buses, local routes)',
      busLimit: 'Up to 5 buses',
      icon: Bus,
      features: [
        'Company profile',
        'Up to 5 buses',
        'Create schedules',
        'Seat management',
        'Basic ticket sales',
        'Manual driver assignment',
        'Daily revenue summary',
      ],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 150000,
      description: 'Ideal for growing companies with expanding routes',
      targetSize: 'Medium operators (6-20 buses, inter-city routes)',
      busLimit: 'Up to 20 buses',
      icon: TrendingUp,
      popular: true,
      features: [
        'Everything in Starter, plus:',
        'Real-time GPS tracking',
        'Ticket cancellation rules',
        'Advanced revenue analytics',
        'Driver accounts',
        'Route performance statistics',
        'Priority support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 250000,
      description: 'Complete solution for large-scale operations',
      targetSize: 'Large operators (20+ buses, multi-city or national)',
      busLimit: 'Unlimited buses',
      icon: Globe,
      features: [
        'Everything in Growth, plus:',
        'Unlimited buses',
        'Multiple admin accounts',
        'Custom reports',
        'API access',
        'Dedicated support',
        'SLA (uptime guarantee)',
        'Custom integrations',
      ],
    },
  ];

  const styles: Record<string, CSSProperties> = {
    container: {
      padding: '32px',
      maxWidth: '1400px',
      margin: '0 auto',
      background: '#F9FAFB',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '48px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '12px',
    },
    subtitle: {
      fontSize: '18px',
      color: '#6B7280',
      maxWidth: '600px',
      margin: '0 auto',
      lineHeight: '1.6',
    },
    currentPlanCard: {
      background: 'linear-gradient(135deg, #0077B6 0%, #005F8E 100%)',
      padding: '32px',
      borderRadius: '16px',
      marginBottom: '48px',
      color: 'white',
      boxShadow: '0 10px 40px rgba(0, 119, 182, 0.3)',
    },
    currentPlanHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap' as const,
      gap: '16px',
    },
    currentPlanTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 20px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      backdropFilter: 'blur(10px)',
    },
    planDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '20px',
    },
    detailItem: {
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    detailLabel: {
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: '6px',
      fontWeight: '500',
    },
    detailValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: 'white',
    },
    plansGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '32px',
      marginBottom: '48px',
    },
    planCard: {
      background: 'white',
      padding: '40px 32px',
      borderRadius: '20px',
      border: '2px solid #E5E7EB',
      position: 'relative' as const,
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    planCardPopular: {
      border: `3px solid ${SAFARITIX.primary}`,
      boxShadow: '0 20px 60px rgba(0, 119, 182, 0.25)',
      transform: 'scale(1.05)',
    },
    popularBadge: {
      position: 'absolute' as const,
      top: '-16px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 24px',
      background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
      color: 'white',
      borderRadius: '24px',
      fontSize: '13px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 4px 12px rgba(21, 128, 61, 0.4)',
      letterSpacing: '0.5px',
    },
    planIconWrapper: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      background: SAFARITIX.primarySoft,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
    },
    planName: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '8px',
    },
    planDescription: {
      fontSize: '14px',
      color: '#6B7280',
      marginBottom: '24px',
      lineHeight: '1.5',
    },
    planPrice: {
      fontSize: '48px',
      fontWeight: '700',
      color: SAFARITIX.primary,
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px',
    },
    planCurrency: {
      fontSize: '24px',
      fontWeight: '600',
    },
    planPeriod: {
      fontSize: '15px',
      color: '#6B7280',
      marginBottom: '24px',
      fontWeight: '500',
    },
    divider: {
      height: '1px',
      background: '#E5E7EB',
      margin: '24px 0',
    },
    targetSection: {
      background: '#F9FAFB',
      padding: '16px',
      borderRadius: '12px',
      marginBottom: '24px',
    },
    targetLabel: {
      fontSize: '12px',
      color: '#6B7280',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '8px',
    },
    targetValue: {
      fontSize: '14px',
      color: '#111827',
      fontWeight: '600',
      marginBottom: '12px',
    },
    busLimit: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      background: SAFARITIX.primarySoft,
      color: SAFARITIX.primary,
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
    },
    featureList: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 32px 0',
      flex: 1,
    },
    featureItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '10px 0',
      fontSize: '15px',
      color: '#374151',
      lineHeight: '1.5',
    },
    featureItemHighlight: {
      fontWeight: '600',
      color: '#111827',
      marginTop: '8px',
    },
    subscribeButton: {
      width: '100%',
      padding: '16px',
      background: SAFARITIX.primary,
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    subscribeButtonPopular: {
      background: 'linear-gradient(135deg, #0077B6 0%, #005F8E 100%)',
      boxShadow: '0 8px 20px rgba(0, 119, 182, 0.3)',
    },
    currentButton: {
      background: '#F3F4F6',
      color: '#6B7280',
      cursor: 'default',
    },
    infoBox: {
      background: 'white',
      border: '2px solid #E5E7EB',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      fontSize: '16px',
      color: '#6B7280',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading subscription information...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Choose Your Plan</h1>
        <p style={styles.subtitle}>
          Select the perfect subscription plan for your bus company. Scale as you grow with flexible options designed for operators of all sizes.
        </p>
      </div>

      {/* Current Plan */}
      {currentPlan && (
        <div style={styles.currentPlanCard}>
          <div style={styles.currentPlanHeader}>
            <h2 style={styles.currentPlanTitle}>
              <Star size={24} fill="white" />
              Your Current Plan
            </h2>
            <span style={styles.statusBadge}>
              <Check size={16} />
              {currentPlan.status.toUpperCase()}
            </span>
          </div>

          <div style={styles.planDetails}>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Plan</div>
              <div style={styles.detailValue}>{currentPlan.plan}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Monthly Cost</div>
              <div style={styles.detailValue}>
                RWF {currentPlan.amount.toLocaleString()}
              </div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Start Date</div>
              <div style={styles.detailValue}>
                {new Date(currentPlan.startDate).toLocaleDateString()}
              </div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Next Billing</div>
              <div style={styles.detailValue}>
                {new Date(currentPlan.endDate).toLocaleDateString()}
              </div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Auto Renew</div>
              <div style={styles.detailValue}>
                {currentPlan.autoRenew ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div style={styles.plansGrid}>
        {plans.map((plan) => {
          const isCurrent = currentPlan?.plan === plan.name;
          const Icon = plan.icon;
          
          return (
            <div
              key={plan.id}
              style={{
                ...styles.planCard,
                ...(plan.popular ? styles.planCardPopular : {}),
              }}
              onMouseEnter={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.borderColor = SAFARITIX.primary;
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 119, 182, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {plan.popular && (
                <div style={styles.popularBadge}>
                  <Star size={14} fill="white" />
                  MOST POPULAR
                </div>
              )}

              <div style={styles.planIconWrapper}>
                <Icon size={32} color={SAFARITIX.primary} />
              </div>

              <h3 style={styles.planName}>{plan.name}</h3>
              
              <p style={styles.planDescription}>{plan.description}</p>
              
              <div style={styles.planPrice}>
                <span style={styles.planCurrency}>RWF</span>
                {plan.price.toLocaleString()}
              </div>
              
              <div style={styles.planPeriod}>per month</div>

              <div style={styles.divider} />

              <div style={styles.targetSection}>
                <div style={styles.targetLabel}>Target Audience</div>
                <div style={styles.targetValue}>{plan.targetSize}</div>
                <div style={styles.busLimit}>
                  <Bus size={16} />
                  {plan.busLimit}
                </div>
              </div>

              <ul style={styles.featureList}>
                {plan.features.map((feature, index) => {
                  const isHighlight = feature.includes('Everything in');
                  
                  return (
                    <li 
                      key={index} 
                      style={{
                        ...styles.featureItem,
                        ...(isHighlight ? styles.featureItemHighlight : {}),
                      }}
                    >
                      <Check 
                        size={20} 
                        color={SAFARITIX.primary} 
                        style={{ flexShrink: 0, marginTop: '2px' }}
                      />
                      <span>{feature}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                style={{
                  ...styles.subscribeButton,
                  ...(plan.popular && !isCurrent ? styles.subscribeButtonPopular : {}),
                  ...(isCurrent ? styles.currentButton : {}),
                }}
                disabled={isCurrent}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = plan.popular 
                      ? '0 12px 28px rgba(0, 119, 182, 0.4)' 
                      : '0 8px 20px rgba(0, 119, 182, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = plan.popular 
                      ? '0 8px 20px rgba(0, 119, 182, 0.3)' 
                      : 'none';
                  }
                }}
              >
                {isCurrent ? (
                  <>
                    <Check size={20} />
                    Current Plan
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    {plan.popular ? 'Get Started Now' : `Subscribe to ${plan.name}`}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Notice */}
      <div style={styles.infoBox}>
        <AlertCircle size={24} color={SAFARITIX.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#111827', fontSize: '16px', display: 'block', marginBottom: '8px' }}>
            Flexible Subscription Management
          </strong>
          <p style={{ color: '#6B7280', fontSize: '15px', margin: 0, lineHeight: '1.6' }}>
            All subscriptions are billed monthly. You can upgrade, downgrade, or cancel your plan at any time. 
            Changes take effect at the start of your next billing cycle. Payments are securely processed through 
            M-PESA or credit card. Need a custom plan? Contact our sales team for enterprise solutions tailored to your needs.
          </p>
        </div>
      </div>
    </div>
  );
}
