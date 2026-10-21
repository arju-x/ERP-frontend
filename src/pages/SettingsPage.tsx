import React from 'react';
import Paper from '@mui/material/Paper';
import SettingsIcon from '@mui/icons-material/Settings';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const SettingsPage: React.FC = () => (
  <>
    <PageHeader
      title="Settings"
      subtitle="Configure shop settings and preferences"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<SettingsIcon />}
        title="Settings Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default SettingsPage;
