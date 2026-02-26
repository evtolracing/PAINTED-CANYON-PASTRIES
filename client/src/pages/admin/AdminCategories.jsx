import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, IconButton,
  Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Skeleton, Chip
} from '@mui/material';
import { Add, Edit, Delete, DragHandle, Refresh, Category } from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const emptyCategory = { name: '', slug: '', description: '', sortOrder: 0, isActive: true };

const AdminCategories = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories', { params: { includeProducts: 'true' } });
      setCategories(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleOpen = (cat = null) => {
    if (cat) {
      setEditing(cat);
      setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', sortOrder: cat.sortOrder, isActive: cat.isActive });
    } else {
      setEditing(null);
      setForm({ ...emptyCategory, sortOrder: categories.length });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { showSnackbar('Name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload);
        showSnackbar('Category updated', 'success');
      } else {
        await api.post('/categories', payload);
        showSnackbar('Category created', 'success');
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.category) return;
    try {
      await api.delete(`/categories/${deleteDialog.category.id}`);
      showSnackbar('Category deleted', 'success');
      setDeleteDialog({ open: false, category: null });
      fetchCategories();
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete category', 'error');
    }
  };

  const toggleActive = async (cat) => {
    try {
      await api.put(`/categories/${cat.id}`, {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        sortOrder: cat.sortOrder,
        isActive: !cat.isActive,
      });
      showSnackbar(`Category ${cat.isActive ? 'deactivated' : 'activated'}`, 'success');
      fetchCategories();
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update category', 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Categories</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Add Category</Button>
          <IconButton onClick={fetchCategories}><Refresh /></IconButton>
        </Box>
      </Box>

      {loading ? (
        <Paper sx={{ p: 2 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
        </Paper>
      ) : categories.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Category sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">No categories yet</Typography>
          <Button variant="contained" sx={{ mt: 2 }} startIcon={<Add />} onClick={() => handleOpen()}>
            Create First Category
          </Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={40}></TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell align="center">Products</TableCell>
                  <TableCell align="center">Sort Order</TableCell>
                  <TableCell align="center">Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.sort((a, b) => a.sortOrder - b.sortOrder).map(cat => (
                  <TableRow key={cat.id} hover>
                    <TableCell><DragHandle sx={{ color: 'text.secondary', cursor: 'grab' }} /></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{cat.name}</TableCell>
                    <TableCell><Chip label={cat.slug} size="small" variant="outlined" /></TableCell>
                    <TableCell align="center">{cat.products?.length || 0}</TableCell>
                    <TableCell align="center">{cat.sortOrder}</TableCell>
                    <TableCell align="center">
                      <Switch size="small" checked={cat.isActive} onChange={() => toggleActive(cat)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(cat)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, category: cat })}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            sx={{ mt: 2, mb: 2 }} required />
          <TextField fullWidth label="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            sx={{ mb: 2 }} helperText="Leave blank to auto-generate" />
          <TextField fullWidth label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            sx={{ mb: 2 }} multiline rows={2} />
          <TextField fullWidth label="Sort Order" type="number" value={form.sortOrder}
            onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            <Typography variant="body2">{form.isActive ? 'Active' : 'Inactive'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, category: null })}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteDialog.category?.name}"? Products in this category will need to be reassigned.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, category: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCategories;
