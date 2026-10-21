import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Stack, Chip, IconButton, Tooltip,
  Dialog, DialogContent, Button, Typography, Divider, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, CircularProgress, alpha,
} from '@mui/material';
import {
  Search as SearchIcon, Visibility as ViewIcon,
  Print as PrintIcon, Receipt as ReceiptIcon,
  Close as CloseIcon, CalendarToday,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import { salesApi } from '../api/sales';
import { Sale } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const DATE_FILTERS = [
  { label: 'All',        value: 'all' },
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom',     value: 'custom' },
];

function getDateRange(filter: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  if (filter === 'today') return { startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
  if (filter === 'week')  return { startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString() };
  if (filter === 'month') return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  if (filter === 'custom' && customStart) return {
    startDate: new Date(customStart).toISOString(),
    ...(customEnd && { endDate: new Date(new Date(customEnd).setHours(23, 59, 59, 999)).toISOString() }),
  };
  return {};
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
    paid:    { label: 'Paid',    color: 'success' },
    partial: { label: 'Partial', color: 'warning' },
    unpaid:  { label: 'Unpaid',  color: 'error' },
  };
  const s = map[status] ?? { label: status, color: 'error' as const };
  return <Chip label={s.label} size="small" color={s.color} sx={{ fontWeight: 700, minWidth: 72 }} />;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    cash: '#27ae60', upi: '#8e44ad', card: '#2980b9', bank_transfer: '#e67e22',
  };
  const label = method.replace('_', ' ').toUpperCase();
  const color = colors[method] ?? '#666';
  return (
    <Chip label={label} size="small" variant="outlined"
      sx={{ fontWeight: 700, fontSize: 10, color, borderColor: color, minWidth: 64 }} />
  );
}

export default function SalesHistoryPage() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [sales,        setSales]        = useState<Sale[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [dateFilter,   setDateFilter]   = useState('all');
  const [page,         setPage]         = useState(0);
  const [rowsPerPage,  setRowsPerPage]  = useState(20);
  const [viewSale,     setViewSale]     = useState<Sale | null>(null);
  const [customStart,  setCustomStart]  = useState('');
  const [customEnd,    setCustomEnd]    = useState('');

  const fetchSales = useCallback(async () => {
    if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      const range = getDateRange(dateFilter, customStart, customEnd);
      const res = await salesApi.getSales({ search: search || undefined, ...range, page: page + 1, pageSize: rowsPerPage });
      setSales(res.data);
      setTotal(res.pagination.total);
    } catch { enqueueSnackbar('Failed to load sales', { variant: 'error' }); }
    finally { setLoading(false); }
  }, [search, dateFilter, customStart, customEnd, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { const t = setTimeout(() => setPage(0), 350); return () => clearTimeout(t); }, [search]);

  return (
    <Box>
      <PageHeader title="Sales History" subtitle="View and manage all past invoices" />

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2.5} alignItems={{ sm: 'center' }} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search invoice # or customer…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 270 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {DATE_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} size="small" clickable
              color={dateFilter === f.value ? 'primary' : 'default'}
              variant={dateFilter === f.value ? 'filled' : 'outlined'}
              onClick={() => { setDateFilter(f.value); setPage(0); }}
              icon={f.value !== 'all' ? <CalendarToday sx={{ fontSize: '12px !important' }} /> : undefined}
            />
          ))}
        </Stack>

        {/* Custom date pickers */}
        {dateFilter === 'custom' && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <TextField size="small" type="date" label="From" value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
            <TextField size="small" type="date" label="To" value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          </Stack>
        )}

        {!loading && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {total} invoice{total !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Invoice #', 'Customer', 'Items', 'Total', 'Paid', 'Balance', 'Method', 'Status', 'Date', ''].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap', py: 1.5, fontSize: 13 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography color="text.secondary" variant="body2">
                        {search ? 'No invoices match your search' : 'No sales yet'}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s, i) => (
                  <TableRow key={s._id} hover
                    sx={{
                      bgcolor: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'light' ? '#fafafa' : '#1a1a1a'),
                      '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#f0f4ff' : '#1e2a3a' },
                      cursor: 'pointer',
                    }}
                    onClick={() => setViewSale(s)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                        {s.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{s.customerName}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={s.items.length} size="small" variant="outlined" sx={{ minWidth: 32, fontSize: 12 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{fmt(s.grandTotal)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main" fontWeight={600}>{fmt(s.paidAmount)}</Typography>
                    </TableCell>
                    <TableCell>
                      {s.balanceDue > 0
                        ? <Typography variant="body2" color="error.main" fontWeight={600}>{fmt(s.balanceDue)}</Typography>
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell><MethodBadge method={s.paymentMethod} /></TableCell>
                    <TableCell><PaymentBadge status={s.paymentStatus} /></TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>{fmtDate(s.invoiceDate)}</Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View Invoice">
                        <IconButton size="small" onClick={() => setViewSale(s)}
                          sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' } }}>
                          <ViewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>

      {/* ── Invoice View Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!viewSale} onClose={() => setViewSale(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        {viewSale && (
          <>
            {/* Header */}
            <Box sx={{ px: 3, pt: 3, pb: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ReceiptIcon />
                    <Typography variant="h6" fontWeight={700}>{viewSale.invoiceNumber}</Typography>
                    <PaymentBadge status={viewSale.paymentStatus} />
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    {fmtDate(viewSale.invoiceDate)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Print">
                    <IconButton onClick={() => window.print()} sx={{ color: 'white' }}><PrintIcon /></IconButton>
                  </Tooltip>
                  <IconButton onClick={() => setViewSale(null)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </Stack>
              </Stack>

              {/* Meta row */}
              <Stack direction="row" spacing={3} mt={2}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Customer</Typography>
                  <Typography variant="body2" fontWeight={700}>{viewSale.customerName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Payment</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                    {viewSale.paymentMethod.replace('_', ' ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Items</Typography>
                  <Typography variant="body2" fontWeight={700}>{viewSale.items.length}</Typography>
                </Box>
              </Stack>
            </Box>

            <DialogContent sx={{ p: 0 }}>
              {/* Items table */}
              <Box sx={{ px: 3, pt: 2.5 }}>
                <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
                  Items
                </Typography>
                <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                        {['Product', 'Qty', 'Rate', 'Disc%', 'Total'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: 'primary.main' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewSale.items.map((item, idx) => (
                        <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.sku} · {item.unit}</Typography>
                          </TableCell>
                          <TableCell><Typography variant="body2">{item.quantity}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{fmt(item.unitPrice)}</Typography></TableCell>
                          <TableCell>
                            {item.discount > 0
                              ? <Chip label={`${item.discount}%`} size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />
                              : <Typography variant="body2" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell><Typography variant="body2" fontWeight={700}>{fmt(item.lineTotal)}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>

              {/* Totals */}
              <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
                <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
                  Summary
                </Typography>
                <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body2">{fmt(viewSale.subtotal)}</Typography>
                    </Stack>
                    {viewSale.discountTotal > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="success.main">Discount</Typography>
                        <Typography variant="body2" color="success.main">− {fmt(viewSale.discountTotal)}</Typography>
                      </Stack>
                    )}
                    <Divider />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                      <Typography variant="body1" fontWeight={700} color="primary.main">{fmt(viewSale.grandTotal)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Amount Paid</Typography>
                      <Typography variant="body2" color="success.main" fontWeight={600}>{fmt(viewSale.paidAmount)}</Typography>
                    </Stack>
                    {viewSale.balanceDue > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="error.main" fontWeight={700}>Balance Due</Typography>
                        <Typography variant="body2" color="error.main" fontWeight={700}>{fmt(viewSale.balanceDue)}</Typography>
                      </Stack>
                    )}
                  </Stack>
                </Paper>

                {viewSale.notes && (
                  <Box mt={2} p={1.5} sx={{ bgcolor: 'grey.50', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">Note: {viewSale.notes}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>

            {/* Footer */}
            <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
                <Button variant="contained" onClick={() => setViewSale(null)}>Close</Button>
              </Stack>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
}
