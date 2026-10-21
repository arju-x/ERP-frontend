import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, InputAdornment, Chip, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tooltip,
  CircularProgress, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Divider,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon, Inventory2 as InventoryIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { productsApi } from '../api/products';
import { categoriesApi } from '../api/categories';
import { Product } from '../types/product.types';

const UNITS = ['piece', 'pair', 'box', 'kg', 'meter', 'liter', 'set', 'roll'] as const;

const productSchema = z.object({
  name:             z.string().min(1, 'Product name is required'),
  sku:              z.string().min(1, 'SKU is required'),
  category:         z.string().optional(),
  brand:            z.string().optional(),
  unit:             z.enum(UNITS),
  purchaseCost:     z.coerce.number().min(0, 'Cannot be negative'),
  sellingPrice:     z.coerce.number().min(0, 'Cannot be negative'),
  currentStock:     z.coerce.number().min(0, 'Cannot be negative'),
  minStockThreshold:z.coerce.number().min(0, 'Cannot be negative'),
  description:      z.string().optional(),
});
type ProductFormData = z.infer<typeof productSchema>;

function generateSKU(name: string) {
  const p = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PRD';
  return `${p}${Math.floor(1000 + Math.random() * 9000)}`;
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0)        return <Chip label="Out of Stock" size="small" color="error"   sx={{ fontWeight: 600, minWidth: 90 }} />;
  if (stock <= threshold) return <Chip label="Low Stock"   size="small" color="warning" sx={{ fontWeight: 600, minWidth: 90 }} />;
  return                         <Chip label="In Stock"    size="small" color="success" sx={{ fontWeight: 600, minWidth: 90 }} />;
}

const STATUS_FILTERS = [
  { label: 'All',          value: '' },
  { label: 'Low Stock',    value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

// ── Field label helper ────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="caption" fontWeight={600} color="text.secondary" mb={0.5} display="block">
      {children}{required && <span style={{ color: '#e53e3e' }}> *</span>}
    </Typography>
  );
}

export default function ProductsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [products,       setProducts]       = useState<Product[]>([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(false);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [page,           setPage]           = useState(0);
  const [rowsPerPage,    setRowsPerPage]    = useState(20);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [editProduct,    setEditProduct]    = useState<Product | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState<Product | null>(null);
  const [categoryOptions,setCategoryOptions]= useState<string[]>([]);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: 'piece', purchaseCost: 0, sellingPrice: 0, currentStock: 0, minStockThreshold: 10 },
  });
  const nameValue = watch('name');

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getProducts({
        search: search || undefined,
        status: statusFilter || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
    } catch {
      enqueueSnackbar('Failed to load products', { variant: 'error' });
    } finally { setLoading(false); }
  }, [search, statusFilter, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    categoriesApi.getAll().then((c) => setCategoryOptions(c.map((x) => x.name))).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPage(0), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Dialog open ───────────────────────────────────────────────────────────────
  function openAdd() {
    setEditProduct(null);
    reset({ unit: 'piece', purchaseCost: 0, sellingPrice: 0, currentStock: 0, minStockThreshold: 10, name: '', sku: '', category: '', brand: '', description: '' });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    reset({ name: p.name, sku: p.sku, category: p.category ?? '', brand: p.brand ?? '', unit: p.unit, purchaseCost: p.purchaseCost, sellingPrice: p.sellingPrice, currentStock: p.currentStock, minStockThreshold: p.minStockThreshold, description: p.description ?? '' });
    setDialogOpen(true);
  }

  function handleNameBlur() {
    if (!watch('sku') && nameValue) setValue('sku', generateSKU(nameValue));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function onSubmit(data: ProductFormData) {
    setSaving(true);
    try {
      if (editProduct) {
        await productsApi.updateProduct(editProduct._id, data);
        enqueueSnackbar('Product updated', { variant: 'success' });
      } else {
        await productsApi.createProduct(data);
        enqueueSnackbar('Product created', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await productsApi.deleteProduct(deleteTarget._id);
      enqueueSnackbar('Product deleted', { variant: 'success' });
      setDeleteTarget(null);
      fetchProducts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog and inventory"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Product
          </Button>
        }
      />

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2.5} alignItems={{ sm: 'center' }}>
        <TextField
          size="small" placeholder="Search by name, SKU or brand…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} clickable size="small"
              color={statusFilter === f.value ? 'primary' : 'default'}
              variant={statusFilter === f.value ? 'filled' : 'outlined'}
              onClick={() => { setStatusFilter(f.value); setPage(0); }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Product', 'SKU', 'Category', 'Unit', 'Cost', 'Price', 'Stock', 'Status', ''].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap', py: 1.5, fontSize: 13 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography color="text.secondary" variant="body2">
                        {search ? 'No products match your search' : 'No products yet — add your first product'}
                      </Typography>
                      {!search && (
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>
                          Add Product
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p, i) => (
                  <TableRow
                    key={p._id}
                    hover
                    sx={{
                      bgcolor: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'light' ? '#fafafa' : '#1a1a1a'),
                      '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#f0f4ff' : '#1e2a3a' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                      {p.brand && <Typography variant="caption" color="text.secondary">{p.brand}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip label={p.sku} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.category || <span style={{ color: '#aaa' }}>—</span>}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{p.unit}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{fmtCurrency(p.purchaseCost)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">{fmtCurrency(p.sellingPrice)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}
                        color={p.currentStock <= 0 ? 'error.main' : p.currentStock <= p.minStockThreshold ? 'warning.main' : 'success.main'}>
                        {p.currentStock}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StockBadge stock={p.currentStock} threshold={p.minStockThreshold} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(p)}
                            sx={{ '&:hover': { bgcolor: 'primary.light', color: 'primary.main' } }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteTarget(p)}
                            sx={{ '&:hover': { bgcolor: 'error.light', color: 'error.main' } }}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
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

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>

        {/* Header */}
        <Box sx={{ px: 3, pt: 3, pb: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <InventoryIcon />
              <Box>
                <Typography variant="h6" fontWeight={700}>{editProduct ? 'Edit Product' : 'Add New Product'}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {editProduct ? `Editing: ${editProduct.name}` : 'Fill in the product details below'}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setDialogOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>

            {/* Section: Basic Info */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Stack spacing={2.5} mb={3}>
              <Controller name="name" control={control} render={({ field }) => (
                <Box>
                  <FieldLabel required>Product Name</FieldLabel>
                  <TextField {...field} fullWidth size="small" placeholder="e.g. Road Wheel 45mm"
                    error={!!errors.name} helperText={errors.name?.message}
                    onBlur={() => { field.onBlur(); handleNameBlur(); }} />
                </Box>
              )} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="sku" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel required>SKU / Product Code</FieldLabel>
                    <TextField {...field} fullWidth size="small" placeholder="Auto-generated if blank"
                      error={!!errors.sku} helperText={errors.sku?.message || 'Unique identifier for this product'}
                      InputProps={{ sx: { fontFamily: 'monospace' } }} />
                  </Box>
                )} />
                <Controller name="unit" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel required>Unit of Measure</FieldLabel>
                    <TextField {...field} select fullWidth size="small">
                      {UNITS.map((u) => <MenuItem key={u} value={u} sx={{ textTransform: 'capitalize' }}>{u}</MenuItem>)}
                    </TextField>
                  </Box>
                )} />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="category" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel>Category</FieldLabel>
                    <TextField {...field} select fullWidth size="small">
                      <MenuItem value=""><em style={{ color: '#aaa' }}>— None —</em></MenuItem>
                      {categoryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                  </Box>
                )} />
                <Controller name="brand" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel>Brand / Manufacturer</FieldLabel>
                    <TextField {...field} fullWidth size="small" placeholder="e.g. Vega, MRF" />
                  </Box>
                )} />
              </Stack>
            </Stack>

            {/* Section: Pricing */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Pricing
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              <Controller name="purchaseCost" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel>Purchase Cost (₹)</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    error={!!errors.purchaseCost} helperText={errors.purchaseCost?.message || 'What you paid the supplier'}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }} />
                </Box>
              )} />
              <Controller name="sellingPrice" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel required>Selling Price (₹)</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    error={!!errors.sellingPrice} helperText={errors.sellingPrice?.message || 'Price charged to customers'}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }} />
                </Box>
              )} />
              {/* Profit margin preview */}
              {watch('sellingPrice') > 0 && watch('purchaseCost') >= 0 && (
                <Box flex={1} sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 2, width: '100%' }}>
                    <Typography variant="caption" color="success.dark" fontWeight={600}>
                      Margin:{' '}
                      {watch('sellingPrice') > 0
                        ? `${(((watch('sellingPrice') - watch('purchaseCost')) / watch('sellingPrice')) * 100).toFixed(1)}%`
                        : '—'}
                    </Typography>
                    <Typography variant="body2" color="success.dark" fontWeight={700}>
                      Profit: ₹{(watch('sellingPrice') - watch('purchaseCost')).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>

            {/* Section: Stock */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Stock
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              <Controller name="currentStock" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel>{editProduct ? 'Current Stock' : 'Opening Stock'}</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    error={!!errors.currentStock} helperText={editProduct ? 'Changing this creates a stock adjustment record' : 'Initial quantity in stock'}
                    inputProps={{ min: 0 }} />
                </Box>
              )} />
              <Controller name="minStockThreshold" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel>Low Stock Alert Threshold</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    helperText="Alert when stock falls to or below this" inputProps={{ min: 0 }} />
                </Box>
              )} />
            </Stack>

            {/* Section: Description */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Description
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Controller name="description" control={control} render={({ field }) => (
              <TextField {...field} fullWidth size="small" multiline rows={3}
                placeholder="Optional product notes, specifications or details…" />
            )} />
          </Box>
        </DialogContent>

        {/* Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ minWidth: 100 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}
              sx={{ minWidth: 140 }}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving…' : editProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
