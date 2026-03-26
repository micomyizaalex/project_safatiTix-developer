import React, { CSSProperties } from 'react';
import { MapPin, QrCode, Check, CreditCard, Calendar } from 'lucide-react';

interface PhoneMockupsProps {
  style?: CSSProperties;
}

export function PhoneMockups({ style }: PhoneMockupsProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const leftPhoneTransform = isMobile ? 'none' : 'rotate(-6deg) translateY(24px)';
  const centerPhoneTransform = isMobile ? 'none' : 'scale(1.08)';
  const rightPhoneTransform = isMobile ? 'none' : 'rotate(6deg) translateY(24px)';

  const leftPhoneWidth = isMobile ? '220px' : '280px';
  const centerPhoneWidth = isMobile ? '236px' : '300px';
  const rightPhoneWidth = isMobile ? '220px' : '280px';

  const sideScreenHeight = isMobile ? '500px' : '580px';
  const centerScreenHeight = isMobile ? '530px' : '620px';

  const styles: Record<string, CSSProperties> = {
    container: {
      marginTop: '48px',
      display: 'flex',
      justifyContent: isMobile ? 'flex-start' : 'center',
      alignItems: isMobile ? 'center' : 'flex-end',
      gap: '24px',
      position: 'relative' as const,
      flexWrap: isMobile ? 'nowrap' : 'wrap',
      overflowX: isMobile ? 'auto' : 'visible',
      overflowY: 'visible',
      paddingBottom: isMobile ? '16px' : undefined,
      WebkitOverflowScrolling: 'touch',
      ...style,
    },
    // iPhone Frame Styles
    iphoneFrame: {
      background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
      borderRadius: '50px',
      padding: '14px',
      boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
      position: 'relative' as const,
      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    // Notch
    notch: {
      position: 'absolute' as const,
      top: '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '120px',
      height: '28px',
      background: '#000',
      borderRadius: '0 0 20px 20px',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    speaker: {
      width: '50px',
      height: '5px',
      background: '#222',
      borderRadius: '10px',
    },
    camera: {
      width: '10px',
      height: '10px',
      background: '#1a1a4d',
      borderRadius: '50%',
      border: '1px solid #333',
    },
    // Screen
    screen: {
      background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
      borderRadius: '38px',
      overflow: 'hidden' as const,
      position: 'relative' as const,
    },
    // Status Bar
    statusBar: {
      height: '44px',
      background: 'transparent',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 20px',
      paddingTop: '8px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#000',
    },
    time: {
      fontSize: '15px',
      fontWeight: '600',
      letterSpacing: '-0.3px',
    },
    statusIcons: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    // Content Areas
    appHeader: {
      padding: '16px 20px',
      background: 'linear-gradient(135deg, #0077B6 0%, #0096c7 100%)',
      color: 'white',
    },
    appTitle: {
      fontSize: '24px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      marginBottom: '4px',
    },
    appSubtitle: {
      fontSize: '14px',
      opacity: 0.9,
    },
    contentArea: {
      padding: '20px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
    },
    // Ticket Card
    ticketCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      marginBottom: '16px',
      border: '2px dashed #e0e0e0',
    },
    ticketHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      paddingBottom: '16px',
      borderBottom: '1px solid #f0f0f0',
    },
    route: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#2B2D42',
    },
    seatBadge: {
      background: '#0077B6',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
    },
    ticketInfo: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      marginBottom: '16px',
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: '13px',
      color: '#6b7280',
    },
    infoValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2B2D42',
    },
    qrContainer: {
      background: 'white',
      padding: '16px',
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: '8px',
    },
    // Map View
    mapContainer: {
      background: 'white',
      borderRadius: '16px',
      padding: '16px',
      height: '300px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },
    mapPlaceholder: {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #E8F7FF 0%, #DBEAFE 100%)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const,
    },
    busMarker: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#0077B6',
      color: 'white',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 24px rgba(0, 119, 182, 0.4)',
      animation: 'pulse 2s infinite',
    },
    busInfo: {
      position: 'absolute' as const,
      bottom: '16px',
      left: '16px',
      right: '16px',
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
    busNumber: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#2B2D42',
      marginBottom: '4px',
    },
    eta: {
      fontSize: '14px',
      color: '#27AE60',
      fontWeight: '600',
    },
    // Subscription Card
    subscriptionCard: {
      background: 'linear-gradient(135deg, #27AE60 0%, #229954 100%)',
      borderRadius: '16px',
      padding: '24px',
      color: 'white',
      boxShadow: '0 8px 24px rgba(39, 174, 96, 0.3)',
      marginBottom: '16px',
    },
    subBadge: {
      display: 'inline-block',
      background: 'rgba(255, 255, 255, 0.2)',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '12px',
    },
    subTitle: {
      fontSize: '22px',
      fontWeight: '700',
      marginBottom: '8px',
    },
    subFeatures: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      marginTop: '16px',
    },
    feature: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
    },
    renewalInfo: {
      background: 'rgba(255, 255, 255, 0.15)',
      padding: '12px',
      borderRadius: '12px',
      marginTop: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Phone - Ticket View */}
      <div
        style={{
          ...styles.iphoneFrame,
          width: leftPhoneWidth,
          transform: leftPhoneTransform,
          flex: '0 0 auto',
        }}
        onMouseEnter={(e) => {
          if (!isMobile) e.currentTarget.style.transform = 'rotate(0deg) translateY(0) scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = leftPhoneTransform;
        }}
      >
        {/* Notch */}
        <div style={styles.notch}>
          <div style={styles.speaker} />
          <div style={styles.camera} />
        </div>

        {/* Screen */}
        <div style={{ ...styles.screen, height: sideScreenHeight }}>
          {/* Status Bar */}
          <div style={styles.statusBar}>
            <div style={styles.time}>9:41</div>
            <div style={styles.statusIcons}>
              <span>📶</span>
              <span>📡</span>
              <span>🔋</span>
            </div>
          </div>

          {/* App Header */}
          <div style={styles.appHeader}>
            <div style={styles.appTitle}>My Tickets</div>
            <div style={styles.appSubtitle}>Active bookings</div>
          </div>

          {/* Content */}
          <div style={styles.contentArea}>
            <div style={styles.ticketCard}>
              <div style={styles.ticketHeader}>
                <div style={styles.route}>Kigali → Butare</div>
                <div style={styles.seatBadge}>B12</div>
              </div>
              
              <div style={styles.ticketInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Date</span>
                  <span style={styles.infoValue}>Today, Feb 7</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Time</span>
                  <span style={styles.infoValue}>10:00 AM</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Bus No.</span>
                  <span style={styles.infoValue}>RW-A34</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Price</span>
                  <span style={styles.infoValue}>RWF 3,500</span>
                </div>
              </div>

              <div style={styles.qrContainer}>
                <QrCode style={{ width: '100px', height: '100px', color: '#2B2D42' }} />
              </div>
            </div>

            <div style={{
              background: '#E8F7FF',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#0077B6',
              fontWeight: '500',
              textAlign: 'center' as const,
            }}>
              ✓ Ready to scan at boarding
            </div>
          </div>
        </div>
      </div>

      {/* Center Phone - Live Tracking */}
      <div
        style={{
          ...styles.iphoneFrame,
          width: centerPhoneWidth,
          transform: centerPhoneTransform,
          zIndex: 20,
          flex: '0 0 auto',
        }}
        onMouseEnter={(e) => {
          if (!isMobile) e.currentTarget.style.transform = 'scale(1.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = centerPhoneTransform;
        }}
      >
        {/* Notch */}
        <div style={styles.notch}>
          <div style={styles.speaker} />
          <div style={styles.camera} />
        </div>

        {/* Screen */}
        <div style={{ ...styles.screen, height: centerScreenHeight }}>
          {/* Status Bar */}
          <div style={styles.statusBar}>
            <div style={styles.time}>9:41</div>
            <div style={styles.statusIcons}>
              <span>📶</span>
              <span>📡</span>
              <span>🔋</span>
            </div>
          </div>

          {/* App Header */}
          <div style={styles.appHeader}>
            <div style={styles.appTitle}>Live Tracking</div>
            <div style={styles.appSubtitle}>Real-time location</div>
          </div>

          {/* Content */}
          <div style={styles.contentArea}>
            <div style={styles.mapContainer}>
              <div style={styles.mapPlaceholder}>
                {/* Decorative map lines */}
                <svg style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.3 }}>
                  <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#0077B6" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#0077B6" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#0077B6" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#0077B6" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#0077B6" strokeWidth="1" strokeDasharray="5,5" />
                </svg>

                {/* Bus Marker */}
                <div style={styles.busMarker}>
                  <span style={{ fontSize: '28px' }}>🚌</span>
                </div>

                {/* Bus Info Card */}
                <div style={styles.busInfo}>
                  <div style={styles.busNumber}>Bus #RW-A34</div>
                  <div style={styles.eta}>⏱ Arriving in 4 min • 3.2 km away</div>
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '8px',
                  }}>
                    <div style={{
                      flex: 1,
                      background: '#E8F7FF',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      textAlign: 'center' as const,
                      fontWeight: '600',
                      color: '#0077B6',
                    }}>
                      Next: City Center
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Progress */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '16px',
              marginTop: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2B2D42', marginBottom: '12px' }}>
                Trip Progress
              </div>
              <div style={{
                height: '6px',
                background: '#E0E0E0',
                borderRadius: '10px',
                overflow: 'hidden' as const,
              }}>
                <div style={{
                  width: '65%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #0077B6 0%, #00A8E8 100%)',
                  borderRadius: '10px',
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: '#6b7280',
              }}>
                <span>Kigali</span>
                <span style={{ color: '#0077B6', fontWeight: '600' }}>65%</span>
                <span>Butare</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Phone - Subscription */}
      <div
        style={{
          ...styles.iphoneFrame,
          width: rightPhoneWidth,
          transform: rightPhoneTransform,
          flex: '0 0 auto',
        }}
        onMouseEnter={(e) => {
          if (!isMobile) e.currentTarget.style.transform = 'rotate(0deg) translateY(0) scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = rightPhoneTransform;
        }}
      >
        {/* Notch */}
        <div style={styles.notch}>
          <div style={styles.speaker} />
          <div style={styles.camera} />
        </div>

        {/* Screen */}
        <div style={{ ...styles.screen, height: sideScreenHeight }}>
          {/* Status Bar */}
          <div style={styles.statusBar}>
            <div style={styles.time}>9:41</div>
            <div style={styles.statusIcons}>
              <span>📶</span>
              <span>📡</span>
              <span>🔋</span>
            </div>
          </div>

          {/* App Header */}
          <div style={styles.appHeader}>
            <div style={styles.appTitle}>Subscription</div>
            <div style={styles.appSubtitle}>Manage your plan</div>
          </div>

          {/* Content */}
          <div style={styles.contentArea}>
            <div style={styles.subscriptionCard}>
              <div style={styles.subBadge}>✨ PREMIUM ACTIVE</div>
              <div style={styles.subTitle}>Monthly Pass</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Unlimited rides across all routes</div>
              
              <div style={styles.subFeatures}>
                <div style={styles.feature}>
                  <Check style={{ width: '20px', height: '20px' }} />
                  <span>Unlimited bus rides</span>
                </div>
                <div style={styles.feature}>
                  <Check style={{ width: '20px', height: '20px' }} />
                  <span>Priority boarding</span>
                </div>
                <div style={styles.feature}>
                  <Check style={{ width: '20px', height: '20px' }} />
                  <span>No booking fees</span>
                </div>
              </div>

              <div style={styles.renewalInfo}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Renews on</div>
                  <div style={{ fontSize: '16px', fontWeight: '700' }}>June 1, 2026</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Price</div>
                  <div style={{ fontSize: '16px', fontWeight: '700' }}>RWF 50,000</div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2B2D42', marginBottom: '16px' }}>
                This Month
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#0077B6' }}>24</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>Trips taken</div>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#27AE60' }}>RWF 34K</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>Saved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shadow Effect */}
      {!isMobile && (
        <div style={{
          position: 'absolute' as const,
          bottom: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '100px',
          background: 'radial-gradient(ellipse, rgba(0, 0, 0, 0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: -1,
        }} />
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              box-shadow: 0 8px 24px rgba(0, 119, 182, 0.4);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.05);
              box-shadow: 0 12px 32px rgba(0, 119, 182, 0.6);
            }
          }
        `}
      </style>
    </div>
  );
}