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
  People, Add, Delete, Edit
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

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

  // Delivery
  const [deliverySettings, setDeliverySettings] = useState({
    'delivery.zipCodes': '', 'delivery.fee': '5.00', 'delivery.minOrder': '25.00',
  });

  // Tax
  const [taxSettings, setTaxSettings] = useState({ 'tax.rate': '8.25' });

  // Users
  const [users, setUsers] = useState([]);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'BAKER' });

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
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'BAKER' });
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to invite user', 'error');
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
          {tab === 3 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Email Templates</Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Email templates are configured for automated notifications. Modify with care.
              </Alert>
              {['Order Confirmation', 'Status Update', 'Delivery Notification', 'Welcome Email'].map((template) => (
                <Paper key={template} variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{template}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sent automatically when triggered
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<Edit />}>
                    View / Edit
                  </Button>
                </Paper>
              ))}
            </Paper>
          )}

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
                        <TableCell align="center">Status</TableCell>
                        <TableCell>Joined</TableCell>
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
                            <Chip label={user.isActive ? 'Active' : 'Inactive'} size="small"
                              color={user.isActive ? 'success' : 'default'} variant="outlined" />
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
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
            <Grid item xs={12}>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite}>Send Invite</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSettings;
