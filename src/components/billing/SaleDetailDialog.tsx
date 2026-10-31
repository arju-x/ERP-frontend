import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Stack,
  Chip, Divider, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AssignmentReturn as ReturnIcon,
  Block as CancelIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptIcon,
} from '@mui/icons-material';
import { Sale } from '../../types/sale.types';

interface SaleDetailDialogProps {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
  onReturn?: () => void;
  onCancel?: () => void;
  onShowBill?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);

function StatusChip({ status }: { status: Sale['status'] }) {
  const map: Record<
    Sale['status'],
    { label: string; color: 'success' | 'error' | 'warning' | 'default' }
  > = {
    confirmed: { label: 'Confirmed', color: 'success' },
    cancelled:  { label: 'Cancelled',  color: 'error' },
    returned:   { label: 'Returned',   color: 'warning' },
    draft:      { label: 'Draft',      color: 'default' },
  };
  const s = map[status] ?? { label: status, color: 'default' as const };
  return (
    <Chip
      label={s.label}
      color={s.color}
      size="small"
      sx={{ fontWeight: 700, fontSize: 12, px: 0.5 }}
    />
  );
}

function PaymentStatusChip({ paymentStatus }: { paymentStatus: Sale['paymentStatus'] }) {
  const map: Record<
    Sale['paymentStatus'],
    { label: string; color: 'success' | 'warning' | 'error' }
  > = {
    paid:    { label: 'Paid',    color: 'success' },
    partial: { label: 'Partial', color: 'warning' },
    unpaid:  { label: 'Unpaid',  color: 'error' },
  };
  const s = map[paymentStatus] ?? { label: paymentStatus, color: 'error' as const };
  return (
    <Chip
      label={s.label}
      color={s.color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: 11 }}
    />
  );
}

export default function SaleDetailDialog({
  open,
  sale,
  onClose,
  onReturn,
  onCancel,
  onShowBill,
}: SaleDetailDialogProps) {
  if (!sale) return null;

  const isConfirmed = sale.status === 'confirmed';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* ── Title bar ─────────────────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          pt: 2.5,
          px: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <ReceiptIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Box>
            <Typography variant="h6" fontWeight={750} lineHeight={1.2}>
              Invoice — {sale.invoiceNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              {new Date(sale.invoiceDate).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Action buttons */}
          {onShowBill && (
            <Tooltip title="View thermal receipt">
              <Button
                startIcon={<PrintIcon />}
                variant="outlined"
                size="small"
                onClick={onShowBill}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Show Bill
              </Button>
            </Tooltip>
          )}
          {onReturn && isConfirmed && (
            <Tooltip title="Process a return for this invoice">
              <Button
                startIcon={<ReturnIcon />}
                variant="outlined"
                size="small"
                onClick={onReturn}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Return Items
              </Button>
            </Tooltip>
          )}
          {onCancel && isConfirmed && (
            <Tooltip title="Cancel this bill">
              <Button
                startIcon={<CancelIcon />}
                variant="outlined"
                color="error"
                size="small"
                onClick={onCancel}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Cancel Bill
              </Button>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close dialog"
            sx={{
              ml: 0.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Cancelled banner */}
        {sale.status === 'cancelled' && (
          <Box
            sx={{
              mb: 2.5,
              px: 2,
              py: 1.25,
              bgcolor: 'error.light',
              color: 'error.dark',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CancelIcon fontSize="small" />
            <Typography variant="body2" fontWeight={700}>
              This bill has been cancelled.
              {sale.cancelledAt &&
                ` Cancelled on ${new Date(sale.cancelledAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}`}
            </Typography>
          </Box>
        )}

        {/* ── Top info grid ──────────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <InfoBlock label="Invoice Number" value={sale.invoiceNumber} mono />
          <InfoBlock
            label="Invoice Date"
            value={new Date(sale.invoiceDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          />
          <InfoBlock label="Customer" value={sale.customerName || 'Walk-in Customer'} />
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: 0.5 }}
            >
              Status
            </Typography>
            <Box mt={0.5}>
              <StatusChip status={sale.status} />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* ── Items table ──────────────────────────────────────────────────── */}
        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
          Items Sold
        </Typography>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', py: 1.25 }}>
                  Product
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', py: 1.25 }}>
                  SKU
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', py: 1.25 }}>
                  Qty
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', py: 1.25 }}>
                  Unit Price
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', py: 1.25 }}>
                  Discount
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', py: 1.25 }}>
                  Line Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items.map((item, i) => (
                <TableRow
                  key={i}
                  sx={{
                    '&:last-child td': { border: 0 },
                    bgcolor: i % 2 === 0 ? 'transparent' : 'action.hover',
                  }}
                >
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {item.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.unit}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}
                    >
                      {item.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      {item.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{fmt(item.unitPrice)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {item.discountAmount > 0 ? (
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        − {fmt(item.discountAmount)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {fmt(item.lineTotal)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Footer: Payment info + Totals ──────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2.5,
          }}
        >
          {/* Payment details */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
              Payment Details
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Payment Method
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                  {sale.paymentMethod.replace('_', ' ')}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Payment Status
                </Typography>
                <PaymentStatusChip paymentStatus={sale.paymentStatus} />
              </Stack>
              {sale.notes && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Notes
                    </Typography>
                    <Typography variant="body2" mt={0.25}>
                      {sale.notes}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>

          {/* Totals */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
              Summary
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {fmt(sale.subtotal)}
                </Typography>
              </Stack>
              {sale.discountTotal > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Discount
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    − {fmt(sale.discountTotal)}
                  </Typography>
                </Stack>
              )}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={700}>
                  Grand Total
                </Typography>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                  {fmt(sale.grandTotal)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Amount Paid
                </Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {fmt(sale.paidAmount)}
                </Typography>
              </Stack>
              {sale.balanceDue > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Balance Due
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">
                    {fmt(sale.balanceDue)}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ── Small helper component ─────────────────────────────────────────────────────
function InfoBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: 10.5,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={700}
        mt={0.5}
        sx={mono ? { fontFamily: 'monospace', fontSize: 13 } : {}}
      >
        {value}
      </Typography>
    </Box>
  );
}
