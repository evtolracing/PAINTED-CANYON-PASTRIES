import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, IconButton, InputAdornment, ToggleButton,
  ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Switch, Skeleton, Grid, Card, CardContent, CardMedia, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Search, Add, ViewModule, ViewList, Edit, Delete, Refresh,
  Inventory2, Star
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const AdminProducts = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, sortBy: 'sortOrder', sortDir: 'asc' };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;

      const [prodRes, catRes] = await Promise.all([
        api.get('/products', { params }),
        api.get('/categories'),
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err) {
      showSnackbar('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async (product) => {
    try {
      await api.put(`/products/${product.id}`, { isActive: !product.isActive });
      showSnackbar(`Product ${product.isActive ? 'deactivated' : 'activated'}`, 'success');
      fetchData();
    } catch (err) {
      showSnackbar('Failed to update product', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.product) return;
    try {
      await api.delete(`/products/${deleteDialog.product.id}`);
      showSnackbar('Product deleted', 'success');
      setDeleteDialog({ open: false, product: null });
      fetchData();
    } catch (err) {
      showSnackbar('Failed to delete product', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
          Products
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/products/new')}>
            Add Product
          </Button>
          <IconButton onClick={fetchData}><Refresh /></IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} label="Category" onChange={e => setCategoryFilter(e.target.value)}>
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={c.slug}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ ml: 'auto' }}>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
              <ToggleButton value="list"><ViewList fontSize="small" /></ToggleButton>
              <ToggleButton value="grid"><ViewModule fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}
        </Box>
      ) : products.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Inventory2 sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">No products found</Typography>
          <Button variant="contained" sx={{ mt: 2 }} startIcon={<Add />} onClick={() => navigate('/admin/products/new')}>
            Add Your First Product
          </Button>
        </Paper>
      ) : viewMode === 'list' ? (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Badges</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {product.isFeatured && <Star sx={{ fontSize: 16, color: 'warning.main' }} />}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{product.name}</Typography>
                      </Box>
                      {product.sku && <Typography variant="caption" color="text.secondary">SKU: {product.sku}</Typography>}
                    </TableCell>
                    <TableCell>{product.category?.name || '—'}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>${parseFloat(product.basePrice).toFixed(2)}</Typography>
                      {product.compareAtPrice && (
                        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                          ${parseFloat(product.compareAtPrice).toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch size="small" checked={product.isActive} onChange={() => toggleActive(product)} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(product.badges || []).map(b => (
                          <Chip key={b} label={b} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate(`/admin/products/${product.id}/edit`)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, product })}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {products.map(product => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: product.isActive ? 1 : 0.6 }}>
                <CardMedia
                  component="div"
                  sx={{ height: 140, bgcolor: 'sandstone.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {product.images?.[0]?.url
                    ? <img src={product.images[0].url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Inventory2 sx={{ fontSize: 40, color: 'text.secondary' }} />
                  }
                </CardMedia>
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{product.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{product.category?.name}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mt: 1 }}>
                    ${parseFloat(product.basePrice).toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                    {(product.badges || []).map(b => <Chip key={b} label={b} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />)}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Switch size="small" checked={product.isActive} onChange={() => toggleActive(product)} />
                  <Box>
                    <IconButton size="small" onClick={() => navigate(`/admin/products/${product.id}/edit`)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, product })}><Delete fontSize="small" /></IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, product: null })}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteDialog.product?.name}"? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, product: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminProducts;
