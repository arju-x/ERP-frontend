import React from 'react';
import Paper from '@mui/material/Paper';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const UsersPage: React.FC = () => (
  <>
    <PageHeader
      title="Users & Roles"
      subtitle="Manage user accounts and access permissions"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Users' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<ManageAccountsIcon />}
        title="Users Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default UsersPage;
