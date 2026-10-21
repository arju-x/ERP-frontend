import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, InputAdornment, Chip, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tooltip,
  FormHelperText, CircularProgress, Typography,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import { productsApi } from '../api/products';
import { categoriesApi } from '../api/categories';
import { Product } from '../types/product.types';

const UNITS = ['piece', 'pair', 'box', 'kg', 'meter', 'liter', 'set', 'roll'] as const;

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.enum(UNITS),
  purchaseCost: z.coerce.number().min(0, 'Cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Cannot be negative'),
  currentStock: z.coerce.number().min(0, 'Cannot be negative'),
  minStockThreshold: z.coerce.number().min(0, 'Cannot be negative'),
  description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

function generateSKU(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PRD';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${suffix}`;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

export default function ProductsPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Categories for dropdown
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: 'piece', purchaseCost: 0, sellingPrice: 0, currentStock: 0, minStockThreshold: 10 },
  });

  const nameValue = watch('name');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await productsApi.getProducts({
        search: search || undefined,
        status: statusFilter || undefined,
        page: page + 1,
        pageSize,
      });
      setProducts(result.data);
      setTotal(result.pagination.total);
    } catch {
      enqueueSnackbar('Failed to load products', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize, enqueueSnackbar]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Load categories for dropdown
  useEffect(() => {
    categoriesApi.getAll()
      .then((cats) => setCategoryOptions(cats.map((c) => c.name)))
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function openAdd() {
    setEditProduct(null);
    reset({ unit: 'piece', purchaseCost: 0, sellingPrice: 0, currentStock: 0, minStockThreshold: 10, name: '', sku: '', category: '', brand: '', description: '' });
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      category: product.category ?? '',
      brand: product.brand ?? '',
      unit: product.unit,
      purchaseCost: product.purchaseCost,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock,
      minStockThreshold: product.minStockThreshold,
      description: product.description ?? '',
    });
    setDialogOpen(true);
  }

  function handleNameBlur() {
    const sku = watch('sku');
    if (!sku && nameValue) {
      setValue('sku', generateSKU(nameValue));
    }
  }

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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save product';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
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

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Product Name', flex: 2, minWidth: 180 },
    { field: 'sku', headerName: 'SKU', width: 110 },
    { field: 'category', headerName: 'Category', width: 120, valueFormatter: (v: string) => v || '—' },
    { field: 'brand', headerName: 'Brand', width: 110, valueFormatter: (v: string) => v || '—' },
    { field: 'unit', headerName: 'Unit', width: 80 },
    {
      field: 'purchaseCost', headerName: 'Cost', width: 110,
      valueFormatter: (v: number) => fmt(v),
    },
    {
      field: 'sellingPrice', headerName: 'Price', width: 110,
      valueFormatter: (v: number) => fmt(v),
    },
    {
      field: 'currentStock', headerName: 'Stock', width: 80,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={600} color={row.currentStock <= 0 ? 'error.main' : row.currentStock <= row.minStockThreshold ? 'warning.main' : 'text.primary'}>
          {row.currentStock}
        </Typography>
      ),
    },
    {
      field: 'status', headerName: 'Status', width: 130,
      renderCell: ({ row }) => {
        const p = row as Product;
        const s = p.currentStock <= 0 ? 'out_of_stock' : p.currentStock <= p.minStockThreshold ? 'low_stock' : 'in_stock';
        return <StatusBadge status={s} statusMap={{
          in_stock: { label: 'In Stock', color: 'success' },
          low_stock: { label: 'Low Stock', color: 'warning' },
          out_of_stock: { label: 'Out of Stock', color: 'error' },
        }} />;
      },
    },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row as Product)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row as Product)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const statusChips = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Low Stock', value: 'low_stock' },
    { label: 'Out of Stock', value: 'out_of_stock' },
  ];

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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Search by name, SKU or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {statusChips.map((chip) => (
            <Chip
              key={chip.value}
              label={chip.label}
              clickable
              color={statusFilter === chip.value ? 'primary' : 'default'}
              variant={statusFilter === chip.value ? 'filled' : 'outlined'}
              onClick={() => { setStatusFilter(chip.value); setPage(0); }}
              size="small"
            />
          ))}
        </Stack>
      </Stack>

      {/* Data Grid */}
      <Box sx={{ height: 540, width: '100%' }}>
        <DataGrid
          rows={products}
          columns={columns}
          getRowId={(row) => row._id}
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={0.5}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField {...field} label="Product Name *" fullWidth size="small" error={!!errors.name} helperText={errors.name?.message} onBlur={() => { field.onBlur(); handleNameBlur(); }} />
            )} />
            <Stack direction="row" spacing={2}>
              <Controller name="sku" control={control} render={({ field }) => (
                <TextField {...field} label="SKU *" fullWidth size="small" error={!!errors.sku} helperText={errors.sku?.message || 'Auto-generated if left blank'} />
              )} />
              <Controller name="unit" control={control} render={({ field }) => (
                <TextField {...field} select label="Unit" fullWidth size="small">
                  {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              )} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Controller name="category" control={control} render={({ field }) => (
                <TextField {...field} select label="Category" fullWidth size="small">
                  <MenuItem value=""><em>— None —</em></MenuItem>
                  {categoryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              )} />
              <Controller name="brand" control={control} render={({ field }) => (
                <TextField {...field} label="Brand" fullWidth size="small" />
              )} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Controller name="purchaseCost" control={control} render={({ field }) => (
                <TextField {...field} label="Purchase Cost (₹)" type="number" fullWidth size="small" error={!!errors.purchaseCost} helperText={errors.purchaseCost?.message} inputProps={{ min: 0, step: 0.01 }} />
              )} />
              <Controller name="sellingPrice" control={control} render={({ field }) => (
                <TextField {...field} label="Selling Price (₹) *" type="number" fullWidth size="small" error={!!errors.sellingPrice} helperText={errors.sellingPrice?.message} inputProps={{ min: 0, step: 0.01 }} />
              )} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Box flex={1}>
                <Controller name="currentStock" control={control} render={({ field }) => (
                  <TextField {...field} label={editProduct ? 'Current Stock' : 'Opening Stock'} type="number" fullWidth size="small" error={!!errors.currentStock} helperText={errors.currentStock?.message} inputProps={{ min: 0 }} />
                )} />
                {editProduct && <FormHelperText>Changing stock creates an adjustment record</FormHelperText>}
              </Box>
              <Controller name="minStockThreshold" control={control} render={({ field }) => (
                <TextField {...field} label="Min Stock Alert" type="number" fullWidth size="small" inputProps={{ min: 0 }} />
              )} />
            </Stack>
            <Controller name="description" control={control} render={({ field }) => (
              <TextField {...field} label="Description" fullWidth size="small" multiline rows={2} />
            )} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editProduct ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
