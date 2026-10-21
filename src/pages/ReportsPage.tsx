import React from 'react';
import Paper from '@mui/material/Paper';
import BarChartIcon from '@mui/icons-material/BarChart';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const ReportsPage: React.FC = () => (
  <>
    <PageHeader
      title="Reports"
      subtitle="Business analytics and financial reports"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Reports' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<BarChartIcon />}
        title="Reports Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default ReportsPage;
