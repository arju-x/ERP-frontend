import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, TextField, Button,
  Divider, Avatar, Chip, CircularProgress, InputAdornment, IconButton, Tab, Tabs,
} from '@mui/material';
import {
  Person, Store, Lock, Visibility, VisibilityOff, Save as SaveIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import { settingsApi, ShopSettings } from '../api/settings';
import { useAuthStore } from '../store/authStore';

// ── Schemas ───────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current', path: ['newPassword'],
});

const shopSchema = z.object({
  shopName:        z.string().min(1, 'Shop name is required'),
  phone:           z.string().optional(),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  gstin:           z.string().optional(),
  invoicePrefix:   z.string().min(1).max(10),
  lowStockDefault: z.coerce.number().min(0),
  line1:   z.string().optional(),
  line2:   z.string().optional(),
  city:    z.string().optional(),
  state:   z.string().optional(),
  pincode: z.string().optional(),
});

type ProfileForm    = z.infer<typeof profileSchema>;
type PasswordForm   = z.infer<typeof passwordSchema>;
type ShopForm       = z.infer<typeof shopSchema>;

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Stack>
      <Divider sx={{ mb: 2.5 }} />
      {children}
    </Paper>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, login } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab]                   = useState(0);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [shopLoading, setShopLoading]   = useState(false);
  const [savingProfile, setSavingProfile]   = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingShop, setSavingShop]         = useState(false);

  // Forms
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const shopForm = useForm<ShopForm>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      shopName: '', phone: '', email: '', gstin: '',
      invoicePrefix: 'INV', lowStockDefault: 10,
      line1: '', line2: '', city: '', state: '', pincode: '',
    },
  });

  // Load shop settings
  useEffect(() => {
    if (!isAdmin) return;
    setShopLoading(true);
    settingsApi.getShop()
      .then((s) => {
        shopForm.reset({
          shopName: s.shopName,
          phone:    s.phone ?? '',
          email:    s.email ?? '',
          gstin:    s.gstin ?? '',
          invoicePrefix:   s.invoicePrefix,
          lowStockDefault: s.lowStockDefault,
          line1:   s.address?.line1 ?? '',
          line2:   s.address?.line2 ?? '',
          city:    s.address?.city  ?? '',
          state:   s.address?.state ?? '',
          pincode: s.address?.pincode ?? '',
        });
      })
      .catch(() => enqueueSnackbar('Failed to load shop settings', { variant: 'error' }))
      .finally(() => setShopLoading(false));
  }, [isAdmin]); // eslint-disable-line

  // ── Profile save ─────────────────────────────────────────────────────────────
  async function handleProfileSave(data: ProfileForm) {
    setSavingProfile(true);
    try {
      await settingsApi.updateProfile({ name: data.name });
      // Update local store
      const stored = localStorage.getItem('erp_user');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('erp_user', JSON.stringify({ ...u, name: data.name }));
      }
      enqueueSnackbar('Profile updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password save ─────────────────────────────────────────────────────────────
  async function handlePasswordSave(data: PasswordForm) {
    setSavingPassword(true);
    try {
      await settingsApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
      passwordForm.reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to change password';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSavingPassword(false);
    }
  }

  // ── Shop save ─────────────────────────────────────────────────────────────────
  async function handleShopSave(data: ShopForm) {
    setSavingShop(true);
    try {
      await settingsApi.updateShop({
        shopName:        data.shopName,
        phone:           data.phone,
        email:           data.email,
        gstin:           data.gstin,
        invoicePrefix:   data.invoicePrefix,
        lowStockDefault: data.lowStockDefault,
        address: {
          line1:   data.line1,
          line2:   data.line2,
          city:    data.city,
          state:   data.state,
          pincode: data.pincode,
        },
      });
      enqueueSnackbar('Shop settings saved', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save shop settings', { variant: 'error' });
    } finally {
      setSavingShop(false);
    }
  }

  function initials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your profile and shop configuration" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="My Profile" />
        {isAdmin && <Tab icon={<Store sx={{ fontSize: 18 }} />} iconPosition="start" label="Shop Settings" />}
      </Tabs>

      {/* ══════════ TAB 0 — Profile ══════════ */}
      {tab === 0 && (
        <Grid container spacing={3}>

          {/* Profile info */}
          <Grid item xs={12} md={6}>
            <SectionCard title="Profile Information" icon={<Person />}>
              {/* Avatar */}
              <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.4rem', fontWeight: 700 }}>
                  {user?.name ? initials(user.name) : 'U'}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={700}>{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                  <Chip
                    label={user?.role === 'admin' ? 'Admin' : 'Sales Staff'}
                    size="small"
                    color={user?.role === 'admin' ? 'primary' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Stack>

              <Stack spacing={2}>
                <Controller name="name" control={profileForm.control} render={({ field }) => (
                  <TextField {...field} label="Full Name" fullWidth size="small"
                    error={!!profileForm.formState.errors.name}
                    helperText={profileForm.formState.errors.name?.message} />
                )} />
                <TextField label="Email" value={user?.email ?? ''} fullWidth size="small" disabled
                  helperText="Email cannot be changed" />
                <TextField label="Role" value={user?.role === 'admin' ? 'Admin' : 'Sales Staff'} fullWidth size="small" disabled />
                <Button
                  variant="contained" startIcon={savingProfile ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  disabled={savingProfile}
                  onClick={profileForm.handleSubmit(handleProfileSave)}
                >
                  Save Profile
                </Button>
              </Stack>
            </SectionCard>
          </Grid>

          {/* Change password */}
          <Grid item xs={12} md={6}>
            <SectionCard title="Change Password" icon={<Lock />}>
              <Stack spacing={2}>
                <Controller name="currentPassword" control={passwordForm.control} render={({ field }) => (
                  <TextField {...field} label="Current Password" fullWidth size="small"
                    type={showCurrent ? 'text' : 'password'}
                    error={!!passwordForm.formState.errors.currentPassword}
                    helperText={passwordForm.formState.errors.currentPassword?.message}
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCurrent(!showCurrent)}>
                          {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )}} />
                )} />
                <Controller name="newPassword" control={passwordForm.control} render={({ field }) => (
                  <TextField {...field} label="New Password" fullWidth size="small"
                    type={showNew ? 'text' : 'password'}
                    error={!!passwordForm.formState.errors.newPassword}
                    helperText={passwordForm.formState.errors.newPassword?.message}
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNew(!showNew)}>
                          {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )}} />
                )} />
                <Controller name="confirmPassword" control={passwordForm.control} render={({ field }) => (
                  <TextField {...field} label="Confirm New Password" fullWidth size="small"
                    type={showNew ? 'text' : 'password'}
                    error={!!passwordForm.formState.errors.confirmPassword}
                    helperText={passwordForm.formState.errors.confirmPassword?.message} />
                )} />
                <Button
                  variant="outlined" color="warning"
                  startIcon={savingPassword ? <CircularProgress size={16} color="inherit" /> : <Lock />}
                  disabled={savingPassword}
                  onClick={passwordForm.handleSubmit(handlePasswordSave)}
                >
                  Change Password
                </Button>
              </Stack>
            </SectionCard>
          </Grid>

        </Grid>
      )}

      {/* ══════════ TAB 1 — Shop Settings (admin only) ══════════ */}
      {tab === 1 && isAdmin && (
        <Grid container spacing={3}>

          {/* Basic shop info */}
          <Grid item xs={12} md={6}>
            <SectionCard title="Shop Information" icon={<Store />}>
              {shopLoading
                ? <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
                : (
                  <Stack spacing={2}>
                    <Controller name="shopName" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Shop Name *" fullWidth size="small"
                        error={!!shopForm.formState.errors.shopName}
                        helperText={shopForm.formState.errors.shopName?.message} />
                    )} />
                    <Controller name="phone" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Phone" fullWidth size="small" />
                    )} />
                    <Controller name="email" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Email" fullWidth size="small" type="email"
                        error={!!shopForm.formState.errors.email}
                        helperText={shopForm.formState.errors.email?.message} />
                    )} />
                    <Controller name="gstin" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="GSTIN (optional)" fullWidth size="small" />
                    )} />
                  </Stack>
                )
              }
            </SectionCard>
          </Grid>

          {/* Address */}
          <Grid item xs={12} md={6}>
            <SectionCard title="Address" icon={<Store />}>
              {shopLoading
                ? <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
                : (
                  <Stack spacing={2}>
                    <Controller name="line1" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Address Line 1" fullWidth size="small" />
                    )} />
                    <Controller name="line2" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Address Line 2" fullWidth size="small" />
                    )} />
                    <Stack direction="row" spacing={2}>
                      <Controller name="city" control={shopForm.control} render={({ field }) => (
                        <TextField {...field} label="City" fullWidth size="small" />
                      )} />
                      <Controller name="state" control={shopForm.control} render={({ field }) => (
                        <TextField {...field} label="State" fullWidth size="small" />
                      )} />
                    </Stack>
                    <Controller name="pincode" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Pincode" fullWidth size="small" />
                    )} />
                  </Stack>
                )
              }
            </SectionCard>
          </Grid>

          {/* Billing config */}
          <Grid item xs={12} md={6}>
            <SectionCard title="Billing & Inventory" icon={<Store />}>
              {shopLoading
                ? <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
                : (
                  <Stack spacing={2}>
                    <Controller name="invoicePrefix" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Invoice Prefix" fullWidth size="small"
                        helperText={`Bills will be numbered like ${shopForm.watch('invoicePrefix') || 'INV'}-00001`}
                        error={!!shopForm.formState.errors.invoicePrefix} />
                    )} />
                    <Controller name="lowStockDefault" control={shopForm.control} render={({ field }) => (
                      <TextField {...field} label="Low Stock Alert Threshold" fullWidth size="small" type="number"
                        helperText="Alert when stock falls to or below this quantity"
                        inputProps={{ min: 0 }} />
                    )} />
                    <Button
                      variant="contained" size="large" fullWidth
                      startIcon={savingShop ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                      disabled={savingShop}
                      onClick={shopForm.handleSubmit(handleShopSave)}
                    >
                      Save Shop Settings
                    </Button>
                  </Stack>
                )
              }
            </SectionCard>
          </Grid>

        </Grid>
      )}
    </Box>
  );
}
