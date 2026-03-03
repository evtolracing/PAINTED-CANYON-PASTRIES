import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Grid, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress
} from '@mui/material';
import {
  Save, Refresh, Settings, LocalShipping, Receipt, Email,
  People, Add, Delete, Edit, CloudUpload, Pin, Visibility, VisibilityOff
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { getImageUrl } from '../../utils/imageUrl';
import AdminEmailTemplates from './AdminEmailTemplates';

const AdminSettings = () => {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [settings, setSettings] = useState({});

  // Bakery info
  const [bakeryInfo, setBakeryInfo] = useState({
    'bakery.name': 'Painted Canyon Pastries',
    'bakery.address': '', 'bakery.phone': '', 'bakery.email': '',
  });
  const [bakeryLogo, setBakeryLogo] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);



  // Delivery
  const [deliverySettings, setDeliverySettings] = useState({
    'delivery.zipCodes': '', 'delivery.fee': '5.00', 'delivery.minOrder': '25.00',
  });

  // Tax
  const [taxSettings, setTaxSettings] = useState({ 'tax.rate': '8.25' });

  // Users
  const [users, setUsers] = useState([]);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'BAKER', pin: '' });
  const [pinDialog, setPinDialog] = useState({ open: false, user: null });
  const [editPin, setEditPin] = useState('');
  const [showPin, setShowPin] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      const s = data.data || {};
      setSettings(s);

      setBakeryInfo({
        'bakery.name': s['bakery.name'] || 'Painted Canyon Pastries',
        'bakery.address': s['bakery.address'] || '',
        'bakery.phone': s['bakery.phone'] || '',
        'bakery.email': s['bakery.email'] || '',
      });
      setBakeryLogo(s['bakery.logo'] || null);
      setDeliverySettings({
        'delivery.zipCodes': Array.isArray(s['delivery.zipCodes']) ? s['delivery.zipCodes'].join(', ') : (s['delivery.zipCodes'] || ''),
        'delivery.fee': s['delivery.fee'] || '5.00',
        'delivery.minOrder': s['delivery.minOrder'] || '25.00',
      });
      setTaxSettings({
        'tax.rate': s['tax.rate'] || '8.25',
      });
    } catch (err) {
      showSnackbar('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.data || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => { fetchSettings(); fetchUsers(); }, []);

  const saveSettings = async (settingsObj) => {
    setSaving(true);
    try {
      await api.put('/settings', settingsObj);
      showSnackbar('Settings saved', 'success');
      fetchSettings();
    } catch (err) {
      showSnackbar('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveBakeryInfo = () => saveSettings(bakeryInfo);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: uploadData } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = uploadData.data.url;
      await api.put('/settings', { 'bakery.logo': logoUrl });
      setBakeryLogo(logoUrl);
      showSnackbar('Logo updated', 'success');
    } catch (err) {
      showSnackbar('Failed to upload logo', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      await api.put('/settings', { 'bakery.logo': null });
      setBakeryLogo(null);
      showSnackbar('Logo removed', 'success');
    } catch (err) {
      showSnackbar('Failed to remove logo', 'error');
    }
  };
  const saveDeliverySettings = () => {
    const zipCodes = deliverySettings['delivery.zipCodes']
      .split(',').map(z => z.trim()).filter(Boolean);
    saveSettings({
      'delivery.zipCodes': zipCodes,
      'delivery.fee': parseFloat(deliverySettings['delivery.fee']),
      'delivery.minOrder': parseFloat(deliverySettings['delivery.minOrder']),
    });
  };
  const saveTaxSettings = () => saveSettings({ 'tax.rate': parseFloat(taxSettings['tax.rate']) });

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      showSnackbar('All fields are required', 'error'); return;
    }
    try {
      await api.post('/auth/invite', inviteForm);
      showSnackbar('User invited', 'success');
      setInviteDialog(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'BAKER', pin: '' });
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to invite user', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${deleteDialog.user.id}`);
      showSnackbar(`${deleteDialog.user.firstName} ${deleteDialog.user.lastName} has been deleted`, 'success');
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSavePin = async () => {
    if (!pinDialog.user) return;
    try {
      await api.put(`/auth/users/${pinDialog.user.id}`, { pin: editPin || null });
      showSnackbar(editPin ? `PIN updated for ${pinDialog.user.firstName}` : `PIN removed for ${pinDialog.user.firstName}`, 'success');
      setPinDialog({ open: false, user: null });
      setEditPin('');
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update PIN', 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Settings</Typography>
        <IconButton onClick={() => { fetchSettings(); fetchUsers(); }}><Refresh /></IconButton>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Bakery Info" icon={<Settings />} iconPosition="start" />
          <Tab label="Delivery" icon={<LocalShipping />} iconPosition="start" />
          <Tab label="Tax" icon={<Receipt />} iconPosition="start" />
          <Tab label="Email Templates" icon={<Email />} iconPosition="start" />
          <Tab label="Users" icon={<People />} iconPosition="start" />
        </Tabs>
      </Paper>

      {loading ? (
        <Paper sx={{ p: 4 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={56} sx={{ mb: 2 }} />)}
        </Paper>
      ) : (
        <>
          {/* Bakery Info */}
          {tab === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Bakery Information</Typography>
              <Grid container spacing={2}>
                {/* Logo Upload */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Company Logo</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {bakeryLogo ? (
                      <Box
                        component="img"
                        src={getImageUrl(bakeryLogo)}
                        alt="Company logo"
                        sx={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                      />
                    ) : (
                      <Box sx={{ width: 64, height: 64, borderRadius: 1, border: '2px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudUpload sx={{ color: 'text.disabled' }} />
                      </Box>
                    )}
                    <Box>
                      <Button variant="outlined" component="label" size="small" startIcon={<CloudUpload />} disabled={logoUploading}>
                        {logoUploading ? 'Uploading...' : 'Upload Logo'}
                        <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                      </Button>
                      {bakeryLogo && (
                        <Button size="small" color="error" onClick={removeLogo} sx={{ ml: 1 }}>Remove</Button>
                      )}
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        Recommended: Square image, at least 128×128px. PNG or SVG preferred.
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mt: 2 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Bakery Name" value={bakeryInfo['bakery.name']}
                    onChange={e => setBakeryInfo(b => ({ ...b, 'bakery.name': e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Address" value={bakeryInfo['bakery.address']}
                    onChange={e => setBakeryInfo(b => ({ ...b, 'bakery.address': e.target.value }))} multiline rows={2} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone" value={bakeryInfo['bakery.phone']}
                    onChange={e => setBakeryInfo(b => ({ ...b, 'bakery.phone': e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email" value={bakeryInfo['bakery.email']}
                    onChange={e => setBakeryInfo(b => ({ ...b, 'bakery.email': e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" startIcon={<Save />} onClick={saveBakeryInfo} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Delivery Settings */}
          {tab === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Delivery Settings</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Delivery Zip Codes" value={deliverySettings['delivery.zipCodes']}
                    onChange={e => setDeliverySettings(d => ({ ...d, 'delivery.zipCodes': e.target.value }))}
                    helperText="Comma-separated list of zip codes for delivery area" multiline rows={2} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Delivery Fee ($)" type="number" value={deliverySettings['delivery.fee']}
                    onChange={e => setDeliverySettings(d => ({ ...d, 'delivery.fee': e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Minimum Order ($)" type="number" value={deliverySettings['delivery.minOrder']}
                    onChange={e => setDeliverySettings(d => ({ ...d, 'delivery.minOrder': e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" startIcon={<Save />} onClick={saveDeliverySettings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Tax Settings */}
          {tab === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Tax Settings</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Tax Rate (%)" type="number" value={taxSettings['tax.rate']}
                    onChange={e => setTaxSettings(t => ({ ...t, 'tax.rate': e.target.value }))}
                    helperText="Enter as percentage (e.g., 8.25 for 8.25%)" inputProps={{ step: '0.01' }} />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" startIcon={<Save />} onClick={saveTaxSettings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Email Templates */}
          {tab === 3 && <AdminEmailTemplates />}

          {/* User Management */}
          {tab === 4 && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>User Management</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setInviteDialog(true)}>
                  Invite User
                </Button>
              </Box>
              {users.length === 0 ? (
                <Typography color="text.secondary">No users found. Use the invite button to add team members.</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell align="center">POS PIN</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{user.firstName} {user.lastName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip label={user.role} size="small"
                              color={user.role === 'SUPER_ADMIN' ? 'error' : user.role === 'ADMIN' ? 'primary' : 'default'}
                              sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell align="center">
                            {user.pin ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {showPin[user.id] ? user.pin : '••••'}
                                </Typography>
                                <IconButton size="small" onClick={() => setShowPin(s => ({ ...s, [user.id]: !s[user.id] }))}>
                                  {showPin[user.id] ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                                </IconButton>
                                <IconButton size="small" onClick={() => { setPinDialog({ open: true, user }); setEditPin(user.pin || ''); }}>
                                  <Edit sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            ) : (
                              <Button size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}
                                onClick={() => { setPinDialog({ open: true, user }); setEditPin(''); }}>
                                Set PIN
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={user.isActive ? 'Active' : 'Inactive'} size="small"
                              color={user.isActive ? 'success' : 'default'} variant="outlined" />
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell align="center">
                            {user.role !== 'SUPER_ADMIN' && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteDialog({ open: true, user })}
                                title="Delete user"
                              >
                                <Delete sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </>
      )}

      {/* Invite User Dialog */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="First Name" value={inviteForm.firstName}
                onChange={e => setInviteForm(f => ({ ...f, firstName: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Last Name" value={inviteForm.lastName}
                onChange={e => setInviteForm(f => ({ ...f, lastName: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={inviteForm.role} label="Role"
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="MANAGER">Manager</MenuItem>
                  <MenuItem value="BAKER">Baker</MenuItem>
                  <MenuItem value="CASHIER">Cashier</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="POS PIN (optional)" value={inviteForm.pin}
                onChange={e => setInviteForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                helperText="4-6 digit numeric PIN for POS login"
                inputProps={{ maxLength: 6, inputMode: 'numeric' }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite}>Send Invite</Button>
        </DialogActions>
      </Dialog>

      {/* Edit PIN Dialog */}
      <Dialog open={pinDialog.open} onClose={() => setPinDialog({ open: false, user: null })} maxWidth="xs" fullWidth>
        <DialogTitle>
          {pinDialog.user?.pin ? 'Change' : 'Set'} POS PIN for {pinDialog.user?.firstName} {pinDialog.user?.lastName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a 4-6 digit numeric PIN that this user will use to log in to the POS system.
          </Typography>
          <TextField
            fullWidth
            label="POS PIN"
            value={editPin}
            onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, inputMode: 'numeric', style: { fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'monospace' } }}
            helperText={editPin.length > 0 && editPin.length < 4 ? 'PIN must be at least 4 digits' : '4-6 digits'}
            error={editPin.length > 0 && editPin.length < 4}
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialog({ open: false, user: null })}>Cancel</Button>
          {pinDialog.user?.pin && (
            <Button color="error" onClick={() => { setEditPin(''); handleSavePin(); }}>
              Remove PIN
            </Button>
          )}
          <Button variant="contained" onClick={handleSavePin}
            disabled={editPin.length > 0 && editPin.length < 4}>
            Save PIN
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete{' '}
            <strong>{deleteDialog.user?.firstName} {deleteDialog.user?.lastName}</strong> ({deleteDialog.user?.email})?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSettings;
