export type SubscriptionPlan = 'Starter' | 'Growth' | 'Enterprise';

export interface PlanPermissions {
  plan: SubscriptionPlan;
  description?: string;
  limits: {
    maxBuses: number | null;
    maxRoutes: number | null;
    maxActiveSchedules: number | null;
  };
  features: {
    basicDashboard: boolean;
    addBuses: boolean;
    addRoutes: boolean;
    advancedSchedules: boolean;
    unlimitedRoutes: boolean;
    basicAnalytics: boolean;
    fullAnalytics: boolean;
    revenueReports: boolean;
    premiumFeatures: boolean;
    prioritySupport: boolean;
  };
  featureList: string[];
}

export const DEFAULT_PLAN_PERMISSIONS: PlanPermissions = {
  plan: 'Starter',
  description: 'Basic dashboard access with starter operational limits.',
  limits: {
    maxBuses: 5,
    maxRoutes: 10,
    maxActiveSchedules: 30,
  },
  features: {
    basicDashboard: true,
    addBuses: true,
    addRoutes: true,
    advancedSchedules: false,
    unlimitedRoutes: false,
    basicAnalytics: false,
    fullAnalytics: false,
    revenueReports: false,
    premiumFeatures: false,
    prioritySupport: false,
  },
  featureList: ['basicDashboard', 'addBuses', 'addRoutes'],
};

export const PLAN_PERMISSION_PRESETS: Record<SubscriptionPlan, PlanPermissions> = {
  Starter: DEFAULT_PLAN_PERMISSIONS,
  Growth: {
    plan: 'Growth',
    description: 'Adds advanced scheduling, unlimited routes, and basic analytics.',
    limits: {
      maxBuses: 20,
      maxRoutes: null,
      maxActiveSchedules: null,
    },
    features: {
      basicDashboard: true,
      addBuses: true,
      addRoutes: true,
      advancedSchedules: true,
      unlimitedRoutes: true,
      basicAnalytics: true,
      fullAnalytics: false,
      revenueReports: false,
      premiumFeatures: false,
      prioritySupport: false,
    },
    featureList: ['basicDashboard', 'addBuses', 'addRoutes', 'advancedSchedules', 'unlimitedRoutes', 'basicAnalytics'],
  },
  Enterprise: {
    plan: 'Enterprise',
    description: 'Full analytics, revenue reports, premium features, and priority support.',
    limits: {
      maxBuses: null,
      maxRoutes: null,
      maxActiveSchedules: null,
    },
    features: {
      basicDashboard: true,
      addBuses: true,
      addRoutes: true,
      advancedSchedules: true,
      unlimitedRoutes: true,
      basicAnalytics: true,
      fullAnalytics: true,
      revenueReports: true,
      premiumFeatures: true,
      prioritySupport: true,
    },
    featureList: ['basicDashboard', 'addBuses', 'addRoutes', 'advancedSchedules', 'unlimitedRoutes', 'basicAnalytics', 'fullAnalytics', 'revenueReports', 'premiumFeatures', 'prioritySupport'],
  },
};

export const humanizeFeature = (feature: string) => {
  const labels: Record<string, string> = {
    basicDashboard: 'Basic dashboard',
    addBuses: 'Bus management',
    addRoutes: 'Route management',
    advancedSchedules: 'Advanced schedules',
    unlimitedRoutes: 'Unlimited routes',
    basicAnalytics: 'Basic analytics',
    fullAnalytics: 'Full analytics',
    revenueReports: 'Revenue reports',
    premiumFeatures: 'Premium features',
    prioritySupport: 'Priority support',
  };

  return labels[feature] || feature.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
};

export const hasPlanFeature = (permissions: Partial<PlanPermissions> | null | undefined, feature: keyof PlanPermissions['features']) => {
  return Boolean((permissions?.features || DEFAULT_PLAN_PERMISSIONS.features)[feature]);
};

export const getFeatureList = (permissions: Partial<PlanPermissions> | null | undefined) => {
  const featureList = permissions?.featureList;
  if (featureList && featureList.length) {
    return featureList;
  }

  return Object.entries(permissions?.features || DEFAULT_PLAN_PERMISSIONS.features)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
};