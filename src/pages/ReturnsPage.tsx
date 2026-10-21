import React from 'react';
import Paper from '@mui/material/Paper';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const ReturnsPage: React.FC = () => (
  <>
    <PageHeader
      title="Returns"
      subtitle="Process customer and supplier returns"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Returns' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<AssignmentReturnIcon />}
        title="Returns Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default ReturnsPage;
