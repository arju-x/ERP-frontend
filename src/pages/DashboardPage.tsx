import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, Button, CircularProgress,
  Chip,
} from '@mui/material';
import {
  PointOfSale as POSIcon, Add as AddIcon,
  TrendingUp, Inventory2, Warning, ShoppingBag,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../api/sales';
import { DashboardStats, Sale } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon, color = 'primary.main', loading }: StatCardProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%', borderLeft: 4, borderColor: color }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="h5" fontWeight={700}>{value}</Typography>
          )}
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
      </Stack>
    </Paper>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    salesApi.getDashboardStats()
      .then(({ stats: s, recentSales: r }) => {
        setStats(s);
        setRecentSales(r);
      })
      .catch(() => {/* silently fail on dashboard */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<POSIcon />} onClick={() => navigate('/sales')}>
            New Bill
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/products')}>
            Add Product
          </Button>
        </Stack>
      </Stack>

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Sales"
            value={stats?.todaySales ?? 0}
            subtitle="transactions"
            icon={<ShoppingBag sx={{ fontSize: 36 }} />}
            color="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Revenue"
            value={stats ? fmt(stats.todayRevenue) : '—'}
            subtitle="collected today"
            icon={<TrendingUp sx={{ fontSize: 36 }} />}
            color="success.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={stats?.totalProducts ?? 0}
            subtitle="active products"
            icon={<Inventory2 sx={{ fontSize: 36 }} />}
            color="info.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Low Stock Alerts"
            value={stats?.lowStockCount ?? 0}
            subtitle="need restocking"
            icon={<Warning sx={{ fontSize: 36 }} />}
            color={stats && stats.lowStockCount > 0 ? 'warning.main' : 'success.main'}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Recent sales — full width */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Recent Sales</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
            ) : recentSales.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                No sales yet. Create your first bill!
              </Typography>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>Invoice</th>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>Customer</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px' }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '6px 4px' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: '#1a3a5c' }}>{sale.invoiceNumber}</td>
                      <td style={{ padding: '8px 4px' }}>{sale.customerName}</td>
                      <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>{fmt(sale.grandTotal)}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                        <Chip
                          label={sale.paymentStatus}
                          size="small"
                          color={sale.paymentStatus === 'paid' ? 'success' : sale.paymentStatus === 'partial' ? 'warning' : 'error'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 4px', color: '#718096', fontSize: 12 }}>
                        {new Date(sale.invoiceDate).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
