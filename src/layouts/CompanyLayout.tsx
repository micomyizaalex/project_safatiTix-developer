import React, { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';

const SAFARITIX = {
  primary: '#0077B6',
  soft: '#E6F4FB',
};

export default function CompanyLayout() {
  const styles: Record<string, CSSProperties> = {
    wrapper: { display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100%', margin: 0, background: '#F8FAFC' },
    content: { flex: 1, width: '100%', margin: 0, padding: 0 },
  };

  return (
    <div style={styles.wrapper}>
      {/* <Header /> removed */}
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
