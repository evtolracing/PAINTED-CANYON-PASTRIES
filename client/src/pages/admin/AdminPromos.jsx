import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Switch,
  Select, MenuItem, FormControl, InputLabel, Skeleton
} from '@mui/material';
import { Add, Edit, Delete, Refresh, LocalOffer } from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const emptyPromo = {
  code: '', type: 'PERCENTAGE', value: '', description: '',
  minOrderAmount: '', maxUses: '', startsAt: '', expiresAt: '', isActive: true,
};

const AdminPromos = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPromo);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, promo: null });

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/promos');
      setPromos(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load promotions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, []);

  const handleOpen = (promo = null) => {
    if (promo) {
      setEditing(promo);
      setForm({
        code: promo.code, type: promo.type, value: promo.value,
        description: promo.description || '',
        minOrderAmount: promo.minOrderAmount || '',
        maxUses: promo.maxUses || '',
        startsAt: promo.startsAt ? promo.startsAt.slice(0, 10) : '',
        expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : '',
        isActive: promo.isActive,
      });
    } else {
      setEditing(null);
      setForm(emptyPromo);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.type || !form.value) {
      showSnackbar('Code, type, and value are required', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        description: form.description || null,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        isActive: form.isActive,
      };

      if (editing) {
        await api.put(`/promos/${editing.id}`, payload);
        showSnackbar('Promotion updated', 'success');
      } else {
        await api.post('/promos', payload);
        showSnackbar('Promotion created', 'success');
      }
      setDialogOpen(false);
      fetchPromos();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save promotion', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.promo) return;
    try {
      await api.delete(`/promos/${deleteDialog.promo.id}`);
      showSnackbar('Promotion deleted', 'success');
      setDeleteDialog({ open: false, promo: null });
      fetchPromos();
    } catch (err) {
      showSnackbar('Failed to delete promotion', 'error');
    }
  };

  const toggleActive = async (promo) => {
    try {
      await api.put(`/promos/${promo.id}`, { isActive: !promo.isActive });
      showSnackbar(`Promotion ${promo.isActive ? 'deactivated' : 'activated'}`, 'success');
      fetchPromos();
    } catch (err) {
      showSnackbar('Failed to update promotion', 'error');
    }
  };

  const promoStatus = (promo) => {
    if (!promo.isActive) return { label: 'Inactive', color: 'default' };
    const now = new Date();
    if (promo.startsAt && now < new Date(promo.startsAt)) return { label: 'Scheduled', color: 'info' };
    if (promo.expiresAt && now > new Date(promo.expiresAt)) return { label: 'Expired', color: 'error' };
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return { label: 'Exhausted', color: 'warning' };
    return { label: 'Active', color: 'success' };
  };

  const formatType = (type) => {
    const map = { PERCENTAGE: '%', FIXED_AMOUNT: '$', FREE_ITEM: 'Free Item' };
    return map[type] || type;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Promotions</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Create Promotion</Button>
          <IconButton onClick={fetchPromos}><Refresh /></IconButton>
        </Box>
      </Box>

      {loading ? (
        <Paper sx={{ p: 2 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
        </Paper>
      ) : promos.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <LocalOffer sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">No promotions yet</Typography>
          <Button variant="contained" sx={{ mt: 2 }} startIcon={<Add />} onClick={() => handleOpen()}>
            Create First Promotion
          </Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="center">Usage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {promos.map(promo => {
                  const status = promoStatus(promo);
                  return (
                    <TableRow key={promo.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Chip label={promo.code} size="small" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
                      </TableCell>
                      <TableCell>{formatType(promo.type)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {promo.type === 'PERCENTAGE' ? `${promo.value}%` : promo.type === 'FIXED_AMOUNT' ? `$${parseFloat(promo.value).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {promo.usedCount}{promo.maxUses ? ` / ${promo.maxUses}` : ''}
                      </TableCell>
                      <TableCell>
                        <Chip label={status.label} size="small" color={status.color} sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">
                          {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : '—'}
                          {' → '}
                          {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpen(promo)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, promo })}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Promotion' : 'New Promotion'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Promo Code" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required inputProps={{ style: { fontFamily: 'monospace', fontWeight: 700 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={form.type} label="Type" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                  <MenuItem value="FIXED_AMOUNT">Fixed Amount ($)</MenuItem>
                  <MenuItem value="FREE_ITEM">Free Item</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Value" type="number" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required
                helperText={form.type === 'PERCENTAGE' ? 'Percentage off' : 'Dollar amount'} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Min Order Amount" type="number" value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Max Uses" type="number" value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                helperText="Leave blank for unlimited" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Start Date" value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="End Date" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <Typography variant="body2">{form.isActive ? 'Active' : 'Inactive'}</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, promo: null })}>
        <DialogTitle>Delete Promotion</DialogTitle>
        <DialogContent>
          <Typography>Delete promo code "{deleteDialog.promo?.code}"? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, promo: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPromos;
