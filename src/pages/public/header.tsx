import React, { CSSProperties, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X, HelpCircle, Headphones, User } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';

interface HeaderProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

type NavItem = {
  label: string;
  href?: string;
  to?: string;
  dropdown?: Array<{ label: string; href?: string; to?: string }>;
};

export function Header({ onLoginClick = () => {}, onSignupClick = () => {} }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navItems: NavItem[] = [
    { label: 'Home', to: '/' },
    {
      label: 'Why SafariTix',
      dropdown: [
        { label: 'For Commuters', to: '/why-safaritix/commuters' },
        { label: 'For Transport Companies', to: '/why-safaritix/companies' },
        { label: 'For Drivers', to: '/why-safaritix/drivers' },
      ],
    },
    {
      label: 'Solutions',
      dropdown: [
        { label: 'Bus Tracking', to: '/solutions/bus-tracking' },
        { label: 'Ticketing System', to: '/solutions/ticketing-system' },
        { label: 'Subscription Management', to: '/solutions/subscription-management' },
        { label: 'Driver App', to: '/solutions/driver-app' },
        { label: 'Company Dashboard', to: '/solutions/company-dashboard' },
      ],
    },
    {
      label: 'Resources',
      dropdown: [
        { label: 'Documentation', to: '/resources/documentation' },
        { label: 'Blog', to: '/resources/blog' },
        { label: 'Help Center', to: '/resources/help-center' },
        { label: 'API Reference', to: '/resources/api-reference' },
      ],
    },
    { label: 'Pricing', to: '/pricing' },
  ];

  const styles: Record<string, CSSProperties> = {
    header: {
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%',
      background: 'rgba(255, 255, 255, 0.86)',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 1px 0 rgba(15, 23, 42, 0.06)',
    },
    topBar: {
      background: 'linear-gradient(90deg, #0F172A 0%, #1E293B 100%)',
      color: 'white',
      padding: '6px 0',
      fontSize: '0.75rem',
    },
    topBarContainer: {
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    },
    topBarItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: 'rgba(255, 255, 255, 0.92)',
      letterSpacing: '0.01em',
    },
    topBarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    topBarLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: 'rgba(255, 255, 255, 0.9)',
      textDecoration: 'none',
      fontSize: '0.74rem',
      fontWeight: 600,
      transition: 'color 0.2s',
      cursor: 'pointer',
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    mainNav: {
      background: 'rgba(255, 255, 255, 0.72)',
    },
    navContainer: {
      maxWidth: '100%',
      margin: '0 auto',
      padding: '0 30px 0 6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '54px',
      gap: '16px',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      textDecoration: 'none',
      flexShrink: 0,
      minWidth: '260px',
      marginLeft: '-18px',
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: '22px',
      flex: 1,
      justifyContent: 'center',
    },
    navItem: {
      position: 'relative',
    },
    navLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      color: '#4b5563',
      textDecoration: 'none',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'color 0.2s',
      cursor: 'pointer',
      padding: '10px 0',
      background: 'transparent',
      border: 'none',
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: '8px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
      minWidth: '240px',
      padding: '8px',
      zIndex: 1000,
    },
    dropdownItem: {
      display: 'block',
      padding: '10px 14px',
      color: '#4b5563',
      textDecoration: 'none',
      fontSize: '0.875rem',
      borderRadius: '8px',
      transition: 'all 0.2s',
      cursor: 'pointer',
    },
    navRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexShrink: 0,
    },
    loginBtn: {
      background: 'transparent',
      border: 'none',
      color: '#4b5563',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      padding: '8px 14px',
      transition: 'color 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    getQuoteBtn: {
      background: '#F4A261',
      color: '#2B2D42',
      border: 'none',
      borderRadius: '999px',
      padding: '11px 20px',
      fontSize: '0.875rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 10px 24px rgba(244, 162, 97, 0.22)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    mobileMenuBtn: {
      background: 'transparent',
      border: 'none',
      color: '#4b5563',
      cursor: 'pointer',
      padding: '8px',
      display: 'none',
    },
    mobileMenu: {
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '14px 20px 18px',
    },
    mobileMenuItem: {
      padding: '12px 0',
      borderBottom: '1px solid #f3f4f6',
    },
    mobileMenuLink: {
      display: 'block',
      color: '#4b5563',
      textDecoration: 'none',
      fontSize: '0.9375rem',
      fontWeight: '600',
    },
    mobileSubMenu: {
      marginTop: '8px',
      marginLeft: '16px',
    },
    mobileSubMenuItem: {
      padding: '8px 0',
    },
    mobileSubMenuLink: {
      color: '#6b7280',
      fontSize: '0.875rem',
      textDecoration: 'none',
      display: 'block',
    },
    mobileButtons: {
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
  };

  const desktopNavVisible = window.innerWidth >= 1024;
  const topBarActionsVisible = window.innerWidth >= 768;

  return (
    <header style={styles.header}>
      <div style={styles.topBar}>
        <div style={styles.topBarContainer}>
          <div style={styles.topBarItem}>
            <span>📍</span>
            <span>Kigali, Rwanda</span>
          </div>

          <div style={{ ...styles.topBarRight, display: topBarActionsVisible ? 'flex' : 'none' }}>
            <Link
              to="/faqs"
              style={styles.topBarLink}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F4A261')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            >
              <HelpCircle style={{ width: '14px', height: '14px' }} />
              <span>FAQ</span>
            </Link>
            <Link
              to="/help-center"
              style={styles.topBarLink}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F4A261')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            >
              <Headphones style={{ width: '14px', height: '14px' }} />
              <span>Support</span>
            </Link>
            <button
              onClick={onLoginClick}
              style={styles.topBarLink}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F4A261')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            >
              <User style={{ width: '14px', height: '14px' }} />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </div>

      <nav style={styles.mainNav}>
        <div style={styles.navContainer}>
          <Link to="/" style={styles.logo}>
            <BrandLogo imageWidth={380} imageHeight={124} />
          </Link>

          <div style={{ ...styles.navLinks, display: desktopNavVisible ? 'flex' : 'none' }}>
            {navItems.map((item) => (
              <div
                key={item.label}
                style={styles.navItem}
                onMouseEnter={() => item.dropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.dropdown ? (
                  <>
                    <button
                      style={styles.navLink}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#0077B6')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
                    >
                      <span>{item.label}</span>
                      <ChevronDown style={{ width: '16px', height: '16px' }} />
                    </button>
                    {activeDropdown === item.label && (
                      <div style={styles.dropdown}>
                        {item.dropdown.map((subItem) =>
                          subItem.to ? (
                            <Link
                              key={subItem.label}
                              to={subItem.to}
                              style={styles.dropdownItem}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#F5F7FA';
                                e.currentTarget.style.color = '#0077B6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#4b5563';
                              }}
                            >
                              {subItem.label}
                            </Link>
                          ) : (
                            <a
                              key={subItem.label}
                              href={subItem.href}
                              style={styles.dropdownItem}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#F5F7FA';
                                e.currentTarget.style.color = '#0077B6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#4b5563';
                              }}
                            >
                              {subItem.label}
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </>
                ) : item.to ? (
                  <Link
                    to={item.to}
                    style={styles.navLink}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#0077B6')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    style={styles.navLink}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#0077B6')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
                  >
                    {item.label}
                  </a>
                )}
              </div>
            ))}
          </div>

          <div style={{ ...styles.navRight, display: desktopNavVisible ? 'flex' : 'none' }}>
            <button
              onClick={onSignupClick}
              style={styles.getQuoteBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E76F51';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 14px 28px rgba(244, 162, 97, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F4A261';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(244, 162, 97, 0.22)';
              }}
            >
              <span>Get A Quote</span>
              <span>→</span>
            </button>
          </div>

          <button
            style={{
              ...styles.mobileMenuBtn,
              display: desktopNavVisible ? 'none' : 'block',
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X style={{ width: '24px', height: '24px' }} /> : <Menu style={{ width: '24px', height: '24px' }} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          {navItems.map((item) => (
            <div key={item.label} style={styles.mobileMenuItem}>
              {item.dropdown ? (
                <>
                  <div style={styles.mobileMenuLink}>{item.label}</div>
                  <div style={styles.mobileSubMenu}>
                    {item.dropdown.map((subItem) =>
                      subItem.to ? (
                        <div key={subItem.label} style={styles.mobileSubMenuItem}>
                          <Link
                            to={subItem.to}
                            style={styles.mobileSubMenuLink}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {subItem.label}
                          </Link>
                        </div>
                      ) : (
                        <div key={subItem.label} style={styles.mobileSubMenuItem}>
                          <a
                            href={subItem.href}
                            style={styles.mobileSubMenuLink}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {subItem.label}
                          </a>
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : item.to ? (
                <Link
                  to={item.to}
                  style={styles.mobileMenuLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  href={item.href}
                  style={styles.mobileMenuLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              )}
            </div>
          ))}

          <div style={styles.mobileButtons}>
            <button
              onClick={() => {
                onLoginClick();
                setMobileMenuOpen(false);
              }}
              style={{
                ...styles.loginBtn,
                justifyContent: 'center',
                width: '100%',
                color: '#0077B6',
                fontWeight: '600',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                onSignupClick();
                setMobileMenuOpen(false);
              }}
              style={{
                ...styles.getQuoteBtn,
                justifyContent: 'center',
                width: '100%',
              }}
            >
              Get A Quote →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
