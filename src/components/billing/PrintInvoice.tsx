import React from 'react';
import { Box, Button, Dialog, DialogContent, Divider, Stack, Typography } from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { Sale } from '../../types/sale.types';

interface PrintInvoiceProps {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

export default function PrintInvoice({ open, sale, onClose }: PrintInvoiceProps) {
  if (!sale) return null;

  const shopName = import.meta.env.VITE_SHOP_NAME ?? 'My Shop';

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ p: 0 }}>
        {/* Print action bar — hidden when printing */}
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1}
          sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', '@media print': { display: 'none' } }}
        >
          <Button startIcon={<PrintIcon />} variant="contained" size="small" onClick={handlePrint}>
            Print
          </Button>
          <Button startIcon={<CloseIcon />} size="small" onClick={onClose}>
            Close
          </Button>
        </Stack>

        {/* Invoice content */}
        <Box
          id="invoice-print-area"
          sx={{
            p: 4,
            fontFamily: 'monospace',
            '@media print': {
              '& *': { WebkitPrintColorAdjust: 'exact' },
            },
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={2}>
            <Typography variant="h5" fontWeight={700}>{shopName}</Typography>
            <Typography variant="body2" color="text.secondary">Tax Invoice</Typography>
          </Box>

          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

          {/* Invoice meta */}
          <Stack direction="row" justifyContent="space-between" mb={1}>
            <Box>
              <Typography variant="body2"><strong>Invoice #:</strong> {sale.invoiceNumber}</Typography>
              <Typography variant="body2">
                <strong>Date:</strong>{' '}
                {new Date(sale.invoiceDate).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2"><strong>Customer:</strong> {sale.customerName}</Typography>
              <Typography variant="body2">
                <strong>Payment:</strong> {sale.paymentMethod.replace('_', ' ').toUpperCase()}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

          {/* Items table */}
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '4px 2px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '4px 2px' }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '4px 2px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '4px 2px' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '4px 2px' }}>Disc%</th>
                  <th style={{ textAlign: 'right', padding: '4px 2px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px dotted #eee' }}>
                    <td style={{ padding: '4px 2px' }}>{i + 1}</td>
                    <td style={{ padding: '4px 2px' }}>
                      {item.productName}
                      <br />
                      <span style={{ fontSize: 11, color: '#666' }}>{item.sku} · {item.unit}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 2px' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '4px 2px' }}>{fmt(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 2px' }}>{item.discount}%</td>
                    <td style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

          {/* Totals */}
          <Stack spacing={0.5} alignItems="flex-end">
            <Stack direction="row" justifyContent="space-between" width={220}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">{fmt(sale.subtotal)}</Typography>
            </Stack>
            {sale.discountTotal > 0 && (
              <Stack direction="row" justifyContent="space-between" width={220}>
                <Typography variant="body2" color="success.main">Discount</Typography>
                <Typography variant="body2" color="success.main">- {fmt(sale.discountTotal)}</Typography>
              </Stack>
            )}
            <Stack direction="row" justifyContent="space-between" width={220}>
              <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
              <Typography variant="body1" fontWeight={700}>{fmt(sale.grandTotal)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" width={220}>
              <Typography variant="body2">Amount Paid</Typography>
              <Typography variant="body2">{fmt(sale.paidAmount)}</Typography>
            </Stack>
            {sale.balanceDue > 0 && (
              <Stack direction="row" justifyContent="space-between" width={220}>
                <Typography variant="body2" color="error.main" fontWeight={600}>Balance Due</Typography>
                <Typography variant="body2" color="error.main" fontWeight={600}>{fmt(sale.balanceDue)}</Typography>
              </Stack>
            )}
          </Stack>

          <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

          {sale.notes && (
            <Typography variant="body2" color="text.secondary" mb={1}>
              Note: {sale.notes}
            </Typography>
          )}

          <Typography variant="body2" textAlign="center" color="text.secondary" mt={1}>
            Thank you for your business!
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
