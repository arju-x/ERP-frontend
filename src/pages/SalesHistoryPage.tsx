import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AssignmentReturn as ReturnIcon,
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
  const navigate = useNavigate();
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
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <TableContainer
          sx={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Table size="small" sx={{ width: '100%', tableLayout: { md: 'fixed', xs: 'auto' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 2, fontSize: 12.5, width: { md: '12%' } }}>
                  INVOICE #
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '15%' } }}>
                  CUSTOMER
                </TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1, fontSize: 12.5, width: { md: '7%' } }}>
                  ITEMS
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  TOTAL
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  PAID
                </TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1, fontSize: 12.5, width: { md: '9%' } }}>
                  STATUS
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  DATE
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1, width: { md: '5%' } }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
                  <TableRow
                    key={s._id}
                    hover
                    sx={{
                      bgcolor: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'light' ? '#fafafa' : '#1a1a1a'),
                      '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#f0f4ff' : '#1e2a3a' },
                      cursor: 'pointer',
                    }}
                    onClick={() => setViewSale(s)}
                  >
                    <TableCell sx={{ px: 2 }}>
                      <Typography variant="body2" fontWeight={700} color="primary.main" noWrap sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>
                        {s.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12.5 }} title={s.customerName}>
                        {s.customerName}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 1 }}>
                      <Chip label={s.items.length} size="small" variant="outlined" sx={{ minWidth: 28, height: 22, fontSize: 11, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: 13 }}>
                        {fmt(s.grandTotal)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1.5 }}>
                      <Typography variant="body2" color="success.main" fontWeight={600} noWrap sx={{ fontSize: 12.5 }}>
                        {fmt(s.paidAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 1 }}>
                      <PaymentBadge status={s.paymentStatus} />
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12 }}>
                        {new Date(s.invoiceDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10.5 }}>
                        {new Date(s.invoiceDate).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1 }} onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Invoice">
                          <IconButton
                            size="small"
                            onClick={() => setViewSale(s)}
                            sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' } }}
                          >
                            <ViewIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Process Return">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/returns?invoiceId=${s.invoiceNumber}`)}
                            sx={{ '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main' } }}
                          >
                            <ReturnIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
            {/* Top action bar */}
            <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="contained" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="outlined" size="small" startIcon={<CloseIcon />} onClick={() => setViewSale(null)}>
                Close
              </Button>
            </Box>

            <DialogContent sx={{ px: 4, py: 3 }}>
              {/* Shop name header */}
              <Box textAlign="center" mb={2.5}>
                <Typography variant="h5" fontWeight={800}>
                  {import.meta.env.VITE_APP_NAME || import.meta.env.VITE_SHOP_NAME || 'My Shop'}
                </Typography>
                {import.meta.env.VITE_SHOP_ADDRESS && (
                  <Typography variant="body2" color="text.secondary">{import.meta.env.VITE_SHOP_ADDRESS}</Typography>
                )}
                {import.meta.env.VITE_SHOP_PHONE && (
                  <Typography variant="body2" color="text.secondary">Tel: {import.meta.env.VITE_SHOP_PHONE}</Typography>
                )}
                <Typography variant="body2" color="text.secondary" mt={0.5}>Tax Invoice</Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Invoice meta — 2 columns */}
              <Stack direction="row" justifyContent="space-between" mb={2.5}>
                <Box>
                  <Typography variant="body2">
                    <Box component="span" fontWeight={700}>Invoice #:</Box>{' '}{viewSale.invoiceNumber}
                  </Typography>
                  <Typography variant="body2">
                    <Box component="span" fontWeight={700}>Date:</Box>{' '}{fmtDate(viewSale.invoiceDate)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2">
                    <Box component="span" fontWeight={700}>Customer:</Box>{' '}{viewSale.customerName}
                  </Typography>
                  <Typography variant="body2">
                    <Box component="span" fontWeight={700}>Payment:</Box>{' '}{viewSale.paymentMethod.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Box>
              </Stack>

              {/* Items table */}
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
                    {['#', 'Product', 'Qty', 'Rate', 'Disc. Amt', 'Total'].map((h) => (
                      <TableCell key={h} align={h === '#' || h === 'Product' ? 'left' : 'right'}
                        sx={{ fontWeight: 700, fontSize: 13, pb: 1, px: h === '#' ? 0 : undefined }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewSale.items.map((item, idx) => (
                    <TableRow key={idx} sx={{ '& td': { borderBottom: '1px dashed', borderColor: 'divider', py: 1.2 } }}>
                      <TableCell sx={{ px: 0, color: 'text.secondary', fontSize: 13 }}>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.sku} · {item.unit}</Typography>
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2">{item.quantity}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2">{fmt(item.unitPrice)}</Typography></TableCell>
                      <TableCell align="right">
                        {item.discountAmount > 0
                          ? <Typography variant="body2">{fmt(item.discountAmount)}</Typography>
                          : <Typography variant="body2" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(item.lineTotal)}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals — right aligned */}
              <Stack alignItems="flex-end" spacing={0.6}>
                <Stack direction="row" spacing={6} justifyContent="flex-end">
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" sx={{ minWidth: 90, textAlign: 'right' }}>{fmt(viewSale.subtotal)}</Typography>
                </Stack>
                {viewSale.discountTotal > 0 && (
                  <Stack direction="row" spacing={6} justifyContent="flex-end">
                    <Typography variant="body2" color="success.main">Discount</Typography>
                    <Typography variant="body2" color="success.main" sx={{ minWidth: 90, textAlign: 'right' }}>− {fmt(viewSale.discountTotal)}</Typography>
                  </Stack>
                )}
                <Divider sx={{ width: 260 }} />
                <Stack direction="row" spacing={6} justifyContent="flex-end">
                  <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ minWidth: 90, textAlign: 'right' }}>{fmt(viewSale.grandTotal)}</Typography>
                </Stack>
                <Stack direction="row" spacing={6} justifyContent="flex-end">
                  <Typography variant="body2" color="text.secondary">Amount Paid</Typography>
                  <Typography variant="body2" sx={{ minWidth: 90, textAlign: 'right' }}>{fmt(viewSale.paidAmount)}</Typography>
                </Stack>
              </Stack>

              {viewSale.notes && (
                <Box mt={2} p={1.5} sx={{ bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">Note: {viewSale.notes}</Typography>
                </Box>
              )}

              {/* Thank you footer */}
              <Box textAlign="center" mt={3}>
                <Typography variant="body2" color="primary.main" fontWeight={600}>
                  Thank you for your business!
                </Typography>
              </Box>
            </DialogContent>

            {/* Return Items action */}
            <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<ReturnIcon />}
                onClick={() => {
                  const inv = viewSale.invoiceNumber;
                  setViewSale(null);
                  navigate(`/returns?invoiceId=${inv}`);
                }}
              >
                Return Items
              </Button>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
}
