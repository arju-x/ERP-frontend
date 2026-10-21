import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Stack, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Divider,
} from '@mui/material';
import {
  Search as SearchIcon, Visibility as ViewIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { salesApi } from '../api/sales';
import { Sale } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const DATE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

function getDateRange(filter: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (filter === 'today') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { startDate: s };
  }
  if (filter === 'week') {
    const day = now.getDay();
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).toISOString();
    return { startDate: s };
  }
  if (filter === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return { startDate: s };
  }
  return {};
}

function paymentStatusColor(s: string): 'success' | 'warning' | 'error' {
  if (s === 'paid') return 'success';
  if (s === 'partial') return 'warning';
  return 'error';
}

export default function SalesHistoryPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDateRange(dateFilter);
      const result = await salesApi.getSales({
        search: search || undefined,
        ...range,
        page: page + 1,
        pageSize,
      });
      setSales(result.data);
      setTotal(result.pagination.total);
    } catch {
      enqueueSnackbar('Failed to load sales', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter, page, pageSize, enqueueSnackbar]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  useEffect(() => {
    const t = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(t);
  }, [search]);

  const columns: GridColDef[] = [
    { field: 'invoiceNumber', headerName: 'Invoice #', width: 130 },
    { field: 'customerName', headerName: 'Customer', flex: 1, minWidth: 140 },
    {
      field: 'items', headerName: 'Items', width: 70,
      valueGetter: (_v: unknown, row: Sale) => row.items.length,
    },
    {
      field: 'grandTotal', headerName: 'Total', width: 120,
      valueFormatter: (v: number) => fmt(v),
    },
    {
      field: 'paidAmount', headerName: 'Paid', width: 110,
      valueFormatter: (v: number) => fmt(v),
    },
    {
      field: 'paymentStatus', headerName: 'Status', width: 120,
      renderCell: ({ value }) => (
        <StatusBadge status={String(value)} />
      ),
    },
    {
      field: 'paymentMethod', headerName: 'Method', width: 120,
      valueFormatter: (v: string) => v.replace('_', ' ').toUpperCase(),
    },
    {
      field: 'invoiceDate', headerName: 'Date', width: 160,
      valueFormatter: (v: string) =>
        new Date(v).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="View">
          <IconButton size="small" onClick={() => setViewSale(row as Sale)}>
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Sales History" subtitle="View all past invoices" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Search by invoice # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Stack direction="row" spacing={1}>
          {DATE_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              clickable
              size="small"
              color={dateFilter === f.value ? 'primary' : 'default'}
              variant={dateFilter === f.value ? 'filled' : 'outlined'}
              onClick={() => { setDateFilter(f.value); setPage(0); }}
            />
          ))}
        </Stack>
      </Stack>

      <Box sx={{ height: 540 }}>
        <DataGrid
          rows={sales}
          columns={columns}
          getRowId={(r) => r._id}
          loading={loading}
          rowCount={total}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
        />
      </Box>

      {/* View Sale Dialog */}
      <Dialog open={!!viewSale} onClose={() => setViewSale(null)} maxWidth="sm" fullWidth>
        {viewSale && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <span>Invoice: {viewSale.invoiceNumber}</span>
                <StatusBadge status={viewSale.paymentStatus} />
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={0.5} mb={2}>
                <Typography variant="body2"><strong>Customer:</strong> {viewSale.customerName}</Typography>
                <Typography variant="body2">
                  <strong>Date:</strong>{' '}
                  {new Date(viewSale.invoiceDate).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Typography>
                <Typography variant="body2">
                  <strong>Payment:</strong> {viewSale.paymentMethod.replace('_', ' ').toUpperCase()}
                </Typography>
              </Stack>

              <Divider sx={{ my: 1 }} />

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Product</th>
                    <th style={{ textAlign: 'right', padding: '4px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '4px' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '4px' }}>Disc%</th>
                    <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewSale.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px dotted #f0f0f0' }}>
                      <td style={{ padding: '4px' }}>
                        <Typography variant="body2">{item.productName}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.sku}</Typography>
                      </td>
                      <td style={{ textAlign: 'right', padding: '4px' }}>{item.quantity} {item.unit}</td>
                      <td style={{ textAlign: 'right', padding: '4px' }}>{fmt(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right', padding: '4px' }}>{item.discount}%</td>
                      <td style={{ textAlign: 'right', padding: '4px', fontWeight: 600 }}>{fmt(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Divider sx={{ my: 1 }} />

              <Stack spacing={0.5} alignItems="flex-end">
                <Stack direction="row" justifyContent="space-between" width={200}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{fmt(viewSale.subtotal)}</Typography>
                </Stack>
                {viewSale.discountTotal > 0 && (
                  <Stack direction="row" justifyContent="space-between" width={200}>
                    <Typography variant="body2" color="success.main">Discount</Typography>
                    <Typography variant="body2" color="success.main">- {fmt(viewSale.discountTotal)}</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between" width={200}>
                  <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                  <Typography variant="body1" fontWeight={700}>{fmt(viewSale.grandTotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" width={200}>
                  <Typography variant="body2">Amount Paid</Typography>
                  <Typography variant="body2">{fmt(viewSale.paidAmount)}</Typography>
                </Stack>
                {viewSale.balanceDue > 0 && (
                  <Stack direction="row" justifyContent="space-between" width={200}>
                    <Typography variant="body2" color="error.main" fontWeight={600}>Balance Due</Typography>
                    <Typography variant="body2" color="error.main" fontWeight={600}>{fmt(viewSale.balanceDue)}</Typography>
                  </Stack>
                )}
              </Stack>

              {viewSale.notes && (
                <Typography variant="body2" color="text.secondary" mt={1}>Note: {viewSale.notes}</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
              <Button onClick={() => setViewSale(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
