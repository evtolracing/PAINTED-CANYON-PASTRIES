import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Tabs, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Skeleton, InputAdornment, Grid
} from '@mui/material';
import {
  Add, Refresh, Search, Warning, CheckCircle, Inventory2,
  LocalShipping, Receipt
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const AdminInventory = () => {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Items state
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', type: 'INGREDIENT', unit: 'oz', currentStock: 0, reorderThreshold: 0, cost: '', supplier: '' });

  // Transaction state
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txForm, setTxForm] = useState({ inventoryItemId: '', type: 'RECEIVED', quantity: '', notes: '' });

  // Purchase Orders state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poForm, setPoForm] = useState({ supplier: '', notes: '', items: [] });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/inventory', { params });
      setItems(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  const fetchPOs = async () => {
    try {
      const { data } = await api.get('/inventory/purchase-orders/list');
      setPurchaseOrders(data.data || []);
    } catch (err) {
      // PO endpoint might not exist yet
      setPurchaseOrders([]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchPOs();
  }, [fetchItems]);

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.type || !itemForm.unit) {
      showSnackbar('Name, type, and unit are required', 'error'); return;
    }
    try {
      await api.post('/inventory', {
        ...itemForm,
        currentStock: parseFloat(itemForm.currentStock) || 0,
        reorderThreshold: parseFloat(itemForm.reorderThreshold) || 0,
        cost: itemForm.cost ? parseFloat(itemForm.cost) : null,
        supplier: itemForm.supplier || null,
      });
      showSnackbar('Item added', 'success');
      setItemDialogOpen(false);
      setItemForm({ name: '', type: 'INGREDIENT', unit: 'oz', currentStock: 0, reorderThreshold: 0, cost: '', supplier: '' });
      fetchItems();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to add item', 'error');
    }
  };

  const handleLogTransaction = async () => {
    if (!txForm.inventoryItemId || !txForm.type || !txForm.quantity) {
      showSnackbar('Item, type, and quantity are required', 'error'); return;
    }
    try {
      await api.post(`/inventory/${txForm.inventoryItemId}/transactions`, {
        type: txForm.type,
        quantity: parseFloat(txForm.quantity),
        notes: txForm.notes || null,
      });
      showSnackbar('Transaction logged', 'success');
      setTxDialogOpen(false);
      setTxForm({ inventoryItemId: '', type: 'RECEIVED', quantity: '', notes: '' });
      fetchItems();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to log transaction', 'error');
    }
  };

  const handleCreatePO = async () => {
    if (!poForm.supplier) { showSnackbar('Supplier is required', 'error'); return; }
    try {
      await api.post('/inventory/purchase-orders', poForm);
      showSnackbar('Purchase order created', 'success');
      setPoDialogOpen(false);
      setPoForm({ supplier: '', notes: '', items: [] });
      fetchPOs();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create PO', 'error');
    }
  };

  const stockStatus = (item) => {
    const stock = parseFloat(item.currentStock);
    const threshold = parseFloat(item.reorderThreshold);
    if (stock <= 0) return { label: 'Out', color: 'error' };
    if (stock <= threshold) return { label: 'Low', color: 'warning' };
    return { label: 'OK', color: 'success' };
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Inventory</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => setItemDialogOpen(true)}>Add Item</Button>
          <Button variant="outlined" startIcon={<Receipt />} onClick={() => setTxDialogOpen(true)}>Log Transaction</Button>
          <IconButton onClick={fetchItems}><Refresh /></IconButton>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Items" icon={<Inventory2 />} iconPosition="start" />
          <Tab label="Purchase Orders" icon={<LocalShipping />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small" placeholder="Search items..."
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 220 }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="INGREDIENT">Ingredient</MenuItem>
                  <MenuItem value="PACKAGING">Packaging</MenuItem>
                  <MenuItem value="SUPPLY">Supply</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {loading ? (
            <Paper sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
            </Paper>
          ) : items.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Inventory2 sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">No inventory items found</Typography>
            </Paper>
          ) : (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell align="right">Reorder At</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell align="right">Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => {
                      const status = stockStatus(item);
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                          <TableCell>
                            <Chip label={item.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {parseFloat(item.currentStock).toFixed(1)}
                          </TableCell>
                          <TableCell align="right">{parseFloat(item.reorderThreshold).toFixed(1)}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={status.label} size="small" color={status.color}
                              icon={status.label === 'OK' ? <CheckCircle /> : <Warning />}
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>{item.supplier || '—'}</TableCell>
                          <TableCell align="right">{item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => setPoDialogOpen(true)}>Create PO</Button>
          </Box>
          {purchaseOrders.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <LocalShipping sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">No purchase orders yet</Typography>
            </Paper>
          ) : (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>PO #</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseOrders.map(po => (
                      <TableRow key={po.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{po.poNumber}</TableCell>
                        <TableCell>{po.supplier}</TableCell>
                        <TableCell><Chip label={po.status} size="small" /></TableCell>
                        <TableCell align="right">{po.totalCost ? `$${parseFloat(po.totalCost).toFixed(2)}` : '—'}</TableCell>
                        <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* Add Item Dialog */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Name" value={itemForm.name}
                onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={itemForm.type} label="Type" onChange={e => setItemForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="INGREDIENT">Ingredient</MenuItem>
                  <MenuItem value="PACKAGING">Packaging</MenuItem>
                  <MenuItem value="SUPPLY">Supply</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Unit" value={itemForm.unit}
                onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} placeholder="oz, lbs, each" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Current Stock" type="number" value={itemForm.currentStock}
                onChange={e => setItemForm(f => ({ ...f, currentStock: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Reorder Threshold" type="number" value={itemForm.reorderThreshold}
                onChange={e => setItemForm(f => ({ ...f, reorderThreshold: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Cost" type="number" value={itemForm.cost}
                onChange={e => setItemForm(f => ({ ...f, cost: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Supplier" value={itemForm.supplier}
                onChange={e => setItemForm(f => ({ ...f, supplier: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddItem}>Add Item</Button>
        </DialogActions>
      </Dialog>

      {/* Log Transaction Dialog */}
      <Dialog open={txDialogOpen} onClose={() => setTxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Inventory Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Item</InputLabel>
                <Select value={txForm.inventoryItemId} label="Item"
                  onChange={e => setTxForm(f => ({ ...f, inventoryItemId: e.target.value }))}>
                  {items.map(i => <MenuItem key={i.id} value={i.id}>{i.name} ({parseFloat(i.currentStock).toFixed(1)} {i.unit})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={txForm.type} label="Type" onChange={e => setTxForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="RECEIVED">Received</MenuItem>
                  <MenuItem value="WASTE">Waste</MenuItem>
                  <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Quantity" type="number" value={txForm.quantity}
                onChange={e => setTxForm(f => ({ ...f, quantity: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" value={txForm.notes}
                onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleLogTransaction}>Log Transaction</Button>
        </DialogActions>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={poDialogOpen} onClose={() => setPoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Supplier" value={poForm.supplier}
            onChange={e => setPoForm(f => ({ ...f, supplier: e.target.value }))} sx={{ mt: 2, mb: 2 }} required />
          <TextField fullWidth label="Notes" value={poForm.notes}
            onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePO}>Create PO</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminInventory;
