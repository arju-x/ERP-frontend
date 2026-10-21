import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, InputAdornment,
  Button, Stack, IconButton, MenuItem, Divider, Tooltip,
  Autocomplete, CircularProgress, Chip,
} from '@mui/material';
import {
  Search as SearchIcon, Delete as DeleteIcon,
  PointOfSale as POSIcon, Add as AddIcon, Remove as RemoveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import PrintInvoice from '../components/billing/PrintInvoice';
import { productsApi } from '../api/products';
import { salesApi } from '../api/sales';
import { ProductSearchResult } from '../types/product.types';
import { BillItem, Sale, PaymentMethod } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function SalesPage() {
  const { enqueueSnackbar } = useSnackbar();

  // Product search
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cart
  const [cartItems, setCartItems] = useState<BillItem[]>([]);

  // Customer & payment
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Print dialog
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  // --- Product search (debounced) ---
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 1) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await productsApi.searchProducts(value.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // --- Add product to cart ---
  function addToCart(product: ProductSearchResult) {
    if (product.currentStock <= 0) {
      enqueueSnackbar(`"${product.name}" is out of stock`, { variant: 'warning' });
      return;
    }
    const existing = cartItems.find((i) => i.productId === product._id);
    if (existing) {
      if (existing.quantity >= product.currentStock) {
        enqueueSnackbar(`Only ${product.currentStock} units available`, { variant: 'warning' });
        return;
      }
      setCartItems((prev) =>
        prev.map((i) =>
          i.productId === product._id
            ? { ...i, quantity: i.quantity + 1, lineTotal: calcLineTotal(i.quantity + 1, i.unitPrice, i.discount) }
            : i
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: product.sellingPrice,
          discount: 0,
          lineTotal: product.sellingPrice,
          unit: product.unit,
          currentStock: product.currentStock,
        },
      ]);
    }
    setSearchInput('');
    setSearchResults([]);
  }

  function calcLineTotal(qty: number, price: number, disc: number) {
    return parseFloat((qty * price * (1 - disc / 100)).toFixed(2));
  }

  function updateQty(productId: string, qty: number) {
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: qty, lineTotal: calcLineTotal(qty, i.unitPrice, i.discount) }
          : i
      )
    );
  }

  function updateDiscount(productId: string, disc: number) {
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, discount: disc, lineTotal: calcLineTotal(i.quantity, i.unitPrice, disc) }
          : i
      )
    );
  }

  function updatePrice(productId: string, price: number) {
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, unitPrice: price, lineTotal: calcLineTotal(i.quantity, price, i.discount) }
          : i
      )
    );
  }

  function removeItem(productId: string) {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  // --- Totals ---
  const subtotal = parseFloat(cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2));
  const discountTotal = parseFloat(cartItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.discount) / 100, 0).toFixed(2));
  const grandTotal = parseFloat((subtotal - discountTotal).toFixed(2));
  const paid = parseFloat(amountPaid) || 0;
  const balanceDue = parseFloat((grandTotal - paid).toFixed(2));

  // Auto-fill amount paid when grandTotal changes
  const prevGrandTotal = useRef(0);
  if (grandTotal !== prevGrandTotal.current) {
    prevGrandTotal.current = grandTotal;
    if (!amountPaid || parseFloat(amountPaid) === 0) {
      // don't auto-fill if user has typed something
    }
  }

  // --- Submit ---
  async function handleCreateBill() {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const sale = await salesApi.createSale({
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        paymentMethod,
        amountPaid: paid,
        notes: notes.trim() || undefined,
      });
      enqueueSnackbar(`Bill ${sale.invoiceNumber} created!`, { variant: 'success' });
      setPrintSale(sale);
      // Reset cart
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setAmountPaid('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create bill';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <PageHeader title="New Bill" subtitle="Create a sale invoice" />

      <Grid container spacing={2}>
        {/* LEFT: Product search + cart */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Add Products</Typography>
            <Autocomplete
              freeSolo
              options={searchResults}
              getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.name} (${o.sku})`)}
              inputValue={searchInput}
              onInputChange={(_, v) => handleSearchChange(v)}
              onChange={(_, v) => { if (v && typeof v !== 'string') addToCart(v); }}
              loading={searching}
              renderOption={(props, option) => {
                const o = option as ProductSearchResult;
                return (
                  <li {...props} key={o._id}>
                    <Box sx={{ width: '100%' }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                        <Typography variant="body2" color="primary.main" fontWeight={700}>{fmt(o.sellingPrice)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Typography variant="caption" color="text.secondary">{o.sku}</Typography>
                        {o.brand && <Typography variant="caption" color="text.secondary">· {o.brand}</Typography>}
                        <Chip
                          label={`Stock: ${o.currentStock}`}
                          size="small"
                          color={o.currentStock <= 0 ? 'error' : 'default'}
                          sx={{ height: 16, fontSize: 10 }}
                        />
                      </Stack>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search product by name, SKU or brand…"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    endAdornment: searching ? <CircularProgress size={18} /> : params.InputProps.endAdornment,
                  }}
                />
              )}
            />
          </Paper>

          {/* Cart */}
          <Paper sx={{ p: 2, minHeight: 320 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Cart {cartItems.length > 0 && <Chip label={cartItems.length} size="small" color="primary" sx={{ ml: 1 }} />}
            </Typography>

            {cartItems.length === 0 ? (
              <EmptyState
                icon={<POSIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
                title="Cart is empty"
                description="Search and add products above"
              />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>Product</th>
                      <th style={{ textAlign: 'center', padding: '6px 4px', width: 90 }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', width: 100 }}>Rate (₹)</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', width: 80 }}>Disc%</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', width: 100 }}>Total</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.productId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.sku} · {item.unit}</Typography>
                        </td>
                        <td style={{ textAlign: 'center', padding: '4px' }}>
                          <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                            <IconButton size="small" onClick={() => item.quantity > 1 && updateQty(item.productId, item.quantity - 1)}>
                              <RemoveIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <TextField
                              value={item.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1;
                                if (v > item.currentStock) {
                                  enqueueSnackbar(`Max available: ${item.currentStock}`, { variant: 'warning' });
                                  return;
                                }
                                updateQty(item.productId, Math.max(1, v));
                              }}
                              size="small"
                              inputProps={{ min: 1, max: item.currentStock, style: { textAlign: 'center', width: 36, padding: '4px' } }}
                              type="number"
                            />
                            <IconButton size="small" onClick={() => {
                              if (item.quantity < item.currentStock) updateQty(item.productId, item.quantity + 1);
                              else enqueueSnackbar(`Max available: ${item.currentStock}`, { variant: 'warning' });
                            }}>
                              <AddIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>
                        </td>
                        <td style={{ padding: '4px' }}>
                          <TextField
                            value={item.unitPrice}
                            onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', padding: '4px 6px', width: 70 } }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <TextField
                            value={item.discount}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              updateDiscount(item.productId, v);
                            }}
                            size="small"
                            type="number"
                            inputProps={{ min: 0, max: 100, style: { textAlign: 'right', padding: '4px 6px', width: 50 } }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600 }}>
                          {fmt(item.lineTotal)}
                        </td>
                        <td>
                          <Tooltip title="Remove">
                            <IconButton size="small" color="error" onClick={() => removeItem(item.productId)}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* RIGHT: Bill summary + checkout */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={2}>Bill Summary</Typography>

            {/* Customer */}
            <Stack spacing={1.5} mb={2}>
              <TextField
                label="Customer Name"
                placeholder="Walk-in Customer"
                size="small"
                fullWidth
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <TextField
                label="Phone (optional)"
                size="small"
                fullWidth
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {/* Totals */}
            <Stack spacing={0.75} mb={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">{fmt(subtotal)}</Typography>
              </Stack>
              {discountTotal > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="success.main">Discount</Typography>
                  <Typography variant="body2" color="success.main">- {fmt(discountTotal)}</Typography>
                </Stack>
              )}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">{fmt(grandTotal)}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {/* Payment */}
            <Stack spacing={1.5} mb={2}>
              <TextField
                select
                label="Payment Method"
                size="small"
                fullWidth
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Amount Paid (₹)"
                type="number"
                size="small"
                fullWidth
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={() => setAmountPaid(String(grandTotal))}>
                        Full
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>Balance Due</Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={balanceDue > 0 ? 'error.main' : balanceDue < 0 ? 'warning.main' : 'success.main'}
                >
                  {balanceDue < 0 ? `Change: ${fmt(Math.abs(balanceDue))}` : fmt(Math.max(0, balanceDue))}
                </Typography>
              </Stack>
            </Stack>

            <TextField
              label="Notes (optional)"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={cartItems.length === 0 || submitting}
              onClick={handleCreateBill}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <POSIcon />}
            >
              {submitting ? 'Creating…' : `Create Bill  ${grandTotal > 0 ? `· ${fmt(grandTotal)}` : ''}`}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Print Invoice Dialog */}
      <PrintInvoice open={!!printSale} sale={printSale} onClose={() => setPrintSale(null)} />
    </Box>
  );
}
