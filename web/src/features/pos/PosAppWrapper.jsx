import React from 'react';
import '@pos/index.css';
import { DataProvider } from '@pos/contexts/DataContext';
import { AuthProvider } from '@pos/contexts/AuthContext';
import { SaaSPosShell } from '@pos/App';

export default function PosAppWrapper() {
  return (
    <AuthProvider>
      <DataProvider>
        <SaaSPosShell />
      </DataProvider>
    </AuthProvider>
  );
}
