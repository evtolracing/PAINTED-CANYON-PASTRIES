import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, TextField, Button, Stack, Grid, Tabs, Tab,
  Divider, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, Avatar, Badge,
} from '@mui/material';
import {
  Person, LocationOn, Lock, Edit, Delete, Add, Save, CameraAlt, Close,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

const API_HOST = process.env.REACT_APP_API_HOST || 'http://localhost:5000';

const AccountPage = () => {
  const navigate = useNavigate();
  const { user, checkAuth, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Profile
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '', phone: '',
  });

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addressDialog, setAddressDialog] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: '', street: '', city: '', state: '', zip: '',
  });

  // Password
  const [passwords, setPasswords] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  // Avatar
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);
    setAvatarUploading(true);
    try {
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data.data.user);
      showSnackbar('Profile photo updated!', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to upload photo.', 'error');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    try {
      const { data } = await api.delete('/auth/avatar');
      updateUser(data.data.user);
      showSnackbar('Profile photo removed.', 'success');
    } catch {
      showSnackbar('Failed to remove photo.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setProfile({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
    });
    fetchAddresses();
  }, [user, navigate]);

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/customer/addresses');
      setAddresses(data.data || data || []);
    } catch {
      setAddresses([]);
    }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', profile);
      await checkAuth();
      showSnackbar('Profile updated!', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      showSnackbar('Passwords do not match.', 'error');
      return;
    }
    if (passwords.newPassword.length < 8) {
      showSnackbar('Password must be at least 8 characters.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSnackbar('Password changed!', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddressDialog = (address = null) => {
    setEditAddress(address);
    setAddressForm(address || { label: '', street: '', city: '', state: '', zip: '' });
    setAddressDialog(true);
  };

  const handleAddressSave = async () => {
    try {
      if (editAddress?.id) {
        await api.put(`/customer/addresses/${editAddress.id}`, addressForm);
      } else {
        await api.post('/customer/addresses', addressForm);
      }
      fetchAddresses();
      setAddressDialog(false);
      showSnackbar('Address saved!', 'success');
    } catch {
      showSnackbar('Failed to save address.', 'error');
    }
  };

  const handleAddressDelete = async (id) => {
    try {
      await api.delete(`/customer/addresses/${id}`);
      fetchAddresses();
      showSnackbar('Address removed.', 'success');
    } catch {
      showSnackbar('Failed to delete address.', 'error');
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Typography variant="h2" gutterBottom>My Account</Typography>

        <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              bgcolor: 'sandstone.50',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 56 },
            }}
          >
            <Tab icon={<Person />} iconPosition="start" label="Profile" />
            <Tab icon={<LocationOn />} iconPosition="start" label="Addresses" />
            <Tab icon={<Lock />} iconPosition="start" label="Password" />
          </Tabs>
          <Divider />

          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {/* Profile Tab */}
            {tab === 0 && (
              <Stack spacing={2.5}>
                <Typography variant="h5" gutterBottom>Personal Information</Typography>

                {/* Avatar Upload */}
                <Stack direction="row" alignItems="center" spacing={2.5}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <IconButton
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          width: 32,
                          height: 32,
                          '&:hover': { bgcolor: 'primary.dark' },
                          border: '2px solid white',
                        }}
                      >
                        {avatarUploading ? <CircularProgress size={16} color="inherit" /> : <CameraAlt sx={{ fontSize: 16 }} />}
                      </IconButton>
                    }
                  >
                    <Avatar
                      src={user?.avatar ? `${API_HOST}${user.avatar}` : undefined}
                      sx={{
                        width: 88,
                        height: 88,
                        bgcolor: 'primary.main',
                        fontSize: '1.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </Avatar>
                  </Badge>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>Profile Photo</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      JPG, PNG or WebP. Max 5 MB.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small" variant="outlined"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Upload Photo
                      </Button>
                      {user?.avatar && (
                        <Button
                          size="small" color="error" variant="text"
                          onClick={handleAvatarRemove}
                          disabled={avatarUploading}
                          startIcon={<Close />}
                          sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                          Remove
                        </Button>
                      )}
                    </Stack>
                  </Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField label="First Name" fullWidth value={profile.firstName}
                      onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Last Name" fullWidth value={profile.lastName}
                      onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Email" fullWidth value={profile.email} disabled
                      helperText="Email cannot be changed" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Phone" fullWidth value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                  </Grid>
                </Grid>
                <Button
                  variant="contained" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleProfileSave} disabled={loading}
                  sx={{ borderRadius: 2, alignSelf: 'flex-start' }}
                >
                  Save Changes
                </Button>
              </Stack>
            )}

            {/* Addresses Tab */}
            {tab === 1 && (
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">Saved Addresses</Typography>
                  <Button startIcon={<Add />} variant="outlined" onClick={() => openAddressDialog()}
                    sx={{ borderRadius: 2 }}>
                    Add Address
                  </Button>
                </Stack>

                {addresses.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <LocationOn sx={{ fontSize: 48, color: 'sandstone.300', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      No saved addresses yet. Add one for faster checkout!
                    </Typography>
                  </Box>
                ) : (
                  addresses.map((addr) => (
                    <Paper key={addr.id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        {addr.label && <Typography variant="subtitle2" fontWeight={700}>{addr.label}</Typography>}
                        <Typography variant="body2" color="text.secondary">
                          {addr.street}, {addr.city}, {addr.state} {addr.zip}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openAddressDialog(addr)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleAddressDelete(addr.id)}><Delete fontSize="small" /></IconButton>
                      </Stack>
                    </Paper>
                  ))
                )}

                {/* Address Dialog */}
                <Dialog open={addressDialog} onClose={() => setAddressDialog(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>{editAddress?.id ? 'Edit Address' : 'Add Address'}</DialogTitle>
                  <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <TextField label="Label (e.g., Home, Work)" fullWidth value={addressForm.label}
                        onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))} />
                      <TextField label="Street Address" fullWidth required value={addressForm.street}
                        onChange={(e) => setAddressForm((p) => ({ ...p, street: e.target.value }))} />
                      <Grid container spacing={2}>
                        <Grid item xs={5}>
                          <TextField label="City" fullWidth required value={addressForm.city}
                            onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField label="State" fullWidth required value={addressForm.state}
                            onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))} />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField label="ZIP Code" fullWidth required value={addressForm.zip}
                            onChange={(e) => setAddressForm((p) => ({ ...p, zip: e.target.value }))} />
                        </Grid>
                      </Grid>
                    </Stack>
                  </DialogContent>
                  <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setAddressDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddressSave} sx={{ borderRadius: 2 }}>
                      Save
                    </Button>
                  </DialogActions>
                </Dialog>
              </Stack>
            )}

            {/* Password Tab */}
            {tab === 2 && (
              <Stack spacing={2.5}>
                <Typography variant="h5" gutterBottom>Change Password</Typography>
                <TextField
                  label="Current Password" type="password" fullWidth
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                />
                <TextField
                  label="New Password" type="password" fullWidth
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  helperText="At least 8 characters"
                />
                <TextField
                  label="Confirm New Password" type="password" fullWidth
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
                <Button
                  variant="contained" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Lock />}
                  onClick={handlePasswordChange} disabled={loading}
                  sx={{ borderRadius: 2, alignSelf: 'flex-start' }}
                >
                  Update Password
                </Button>
              </Stack>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AccountPage;
