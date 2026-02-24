import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Chip, IconButton,
  InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Collapse, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Divider
} from '@mui/material';
import {
  Search, Refresh, Person, ExpandMore, ExpandLess, Add, AttachMoney,
  LocalOffer, ShoppingBag, Edit, Delete
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const AdminCustomers = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Dialogs
  const [tagDialog, setTagDialog] = useState({ open: false, customerId: null });
  const [newTag, setNewTag] = useState('');
  const [creditDialog, setCreditDialog] = useState({ open: false, customerId: null });
  const [creditAmount, setCreditAmount] = useState('');
  const [newCustomerDialog, setNewCustomerDialog] = useState(false);
  const [newCustomerSaving, setNewCustomerSaving] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', notes: '',
  });
  const [editDialog, setEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, customer: null });
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50, sortBy: 'createdAt', sortDir: 'desc' };
      if (search) params.search = search;
      if (tagFilter) params.tag = tagFilter;
      const { data } = await api.get('/customers', { params });
      setCustomers(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, tagFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const toggleExpand = async (customerId) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    setExpandedLoading(true);
    try {
      const { data } = await api.get(`/customers/${customerId}`);
      setExpandedData(data.data);
    } catch (err) {
      showSnackbar('Failed to load customer details', 'error');
    } finally {
      setExpandedLoading(false);
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      await api.post(`/customers/${tagDialog.customerId}/tags`, { tag: newTag.trim() });
      showSnackbar('Tag added', 'success');
      setTagDialog({ open: false, customerId: null });
      setNewTag('');
      fetchCustomers();
      if (expandedId === tagDialog.customerId) toggleExpand(tagDialog.customerId);
    } catch (err) {
      showSnackbar('Failed to add tag', 'error');
    }
  };

  const addCredit = async () => {
    if (!creditAmount) return;
    try {
      await api.post(`/customers/${creditDialog.customerId}/credit`, { amount: parseFloat(creditAmount) });
      showSnackbar('Credit added', 'success');
      setCreditDialog({ open: false, customerId: null });
      setCreditAmount('');
      fetchCustomers();
    } catch (err) {
      showSnackbar('Failed to add credit', 'error');
    }
  };

  const handleNewCustomerChange = (field) => (e) => {
    setNewCustomerForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const createCustomer = async () => {
    const { firstName, lastName, email } = newCustomerForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      showSnackbar('First name, last name, and email are required', 'error');
      return;
    }
    setNewCustomerSaving(true);
    try {
      await api.post('/customers', newCustomerForm);
      showSnackbar('Customer created', 'success');
      setNewCustomerDialog(false);
      setNewCustomerForm({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
      fetchCustomers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create customer', 'error');
    } finally {
      setNewCustomerSaving(false);
    }
  };

  const openEditDialog = (customer) => {
    setEditForm({
      id: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
    });
    setEditDialog(true);
  };

  const handleEditChange = (field) => (e) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const saveEdit = async () => {
    if (!editForm) return;
    const { id, firstName, lastName, email } = editForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      showSnackbar('First name, last name, and email are required', 'error');
      return;
    }
    setEditSaving(true);
    try {
      const { id: _, ...payload } = editForm;
      await api.put(`/customers/${id}`, payload);
      showSnackbar('Customer updated', 'success');
      setEditDialog(false);
      setEditForm(null);
      fetchCustomers();
      if (expandedId === id) toggleExpand(id);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update customer', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    const { customer } = deleteDialog;
    if (!customer) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${customer.id}`);
      showSnackbar('Customer deleted', 'success');
      setDeleteDialog({ open: false, customer: null });
      if (expandedId === customer.id) setExpandedId(null);
      fetchCustomers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Collect all tags for filter
  const allTags = [...new Set(customers.flatMap(c => c.tags || []))];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Customers</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => setNewCustomerDialog(true)}>Add Customer</Button>
          <IconButton onClick={fetchCustomers}><Refresh /></IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search customers..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 250 }}
          />
          {allTags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label="All" size="small" variant={!tagFilter ? 'filled' : 'outlined'}
                onClick={() => setTagFilter('')} sx={{ cursor: 'pointer' }}
              />
              {allTags.map(tag => (
                <Chip
                  key={tag} label={tag} size="small"
                  variant={tagFilter === tag ? 'filled' : 'outlined'}
                  onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Customers Table */}
      {loading ? (
        <Paper sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
        </Paper>
      ) : customers.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">No customers found</Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={40}></TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell align="center">Orders</TableCell>
                  <TableCell align="right">Total Spent</TableCell>
                  <TableCell align="right">Credit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map(customer => (
                  <React.Fragment key={customer.id}>
                    <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => toggleExpand(customer.id)}>
                      <TableCell>
                        <IconButton size="small">
                          {expandedId === customer.id ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {customer.firstName} {customer.lastName}
                        {customer.isGuest && <Chip label="Guest" size="small" sx={{ ml: 1, fontSize: '0.6rem', height: 18 }} />}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || '—'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(customer.tags || []).map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{customer._count?.orders || 0}</TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: parseFloat(customer.creditBalance) > 0 ? 'success.main' : 'text.primary' }}>
                        ${parseFloat(customer.creditBalance || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, borderBottom: expandedId === customer.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === customer.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: 'background.default' }}>
                            {expandedLoading ? (
                              <Skeleton height={100} />
                            ) : expandedData ? (
                              <Grid container spacing={3}>
                                <Grid item xs={12} md={4}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Notes</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {expandedData.notes || 'No notes'}
                                  </Typography>
                                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <Button size="small" variant="outlined" startIcon={<Edit />}
                                      onClick={(e) => { e.stopPropagation(); openEditDialog(customer); }}>
                                      Edit
                                    </Button>
                                    <Button size="small" variant="outlined" startIcon={<LocalOffer />}
                                      onClick={(e) => { e.stopPropagation(); setTagDialog({ open: true, customerId: customer.id }); }}>
                                      Add Tag
                                    </Button>
                                    <Button size="small" variant="outlined" startIcon={<AttachMoney />}
                                      onClick={(e) => { e.stopPropagation(); setCreditDialog({ open: true, customerId: customer.id }); }}>
                                      Add Credit
                                    </Button>
                                    <Button size="small" variant="outlined" color="error" startIcon={<Delete />}
                                      onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, customer }); }}>
                                      Delete
                                    </Button>
                                  </Box>
                                </Grid>
                                <Grid item xs={12} md={8}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recent Orders</Typography>
                                  {(expandedData.orders || []).length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">No orders yet</Typography>
                                  ) : (
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Order #</TableCell>
                                          <TableCell>Date</TableCell>
                                          <TableCell>Status</TableCell>
                                          <TableCell align="right">Total</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {(expandedData.orders || []).slice(0, 5).map(order => (
                                          <TableRow key={order.id}>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{order.orderNumber}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell><Chip label={order.status} size="small" sx={{ fontSize: '0.65rem', height: 20 }} /></TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                              ${parseFloat(order.totalAmount).toFixed(2)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </Grid>
                              </Grid>
                            ) : null}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* New Customer Dialog */}
      <Dialog open={newCustomerDialog} onClose={() => setNewCustomerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="First Name" value={newCustomerForm.firstName}
                onChange={handleNewCustomerChange('firstName')} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Last Name" value={newCustomerForm.lastName}
                onChange={handleNewCustomerChange('lastName')} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" value={newCustomerForm.email}
                onChange={handleNewCustomerChange('email')} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Phone" value={newCustomerForm.phone}
                onChange={handleNewCustomerChange('phone')} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" multiline rows={2} value={newCustomerForm.notes}
                onChange={handleNewCustomerChange('notes')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCustomerDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createCustomer} disabled={newCustomerSaving}>
            {newCustomerSaving ? 'Creating...' : 'Create Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialog} onClose={() => { setEditDialog(false); setEditForm(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Customer</DialogTitle>
        {editForm && (
          <>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <TextField fullWidth label="First Name" value={editForm.firstName}
                    onChange={handleEditChange('firstName')} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Last Name" value={editForm.lastName}
                    onChange={handleEditChange('lastName')} required />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Email" type="email" value={editForm.email}
                    onChange={handleEditChange('email')} required />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Phone" value={editForm.phone}
                    onChange={handleEditChange('phone')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Notes" multiline rows={3} value={editForm.notes}
                    onChange={handleEditChange('notes')} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setEditDialog(false); setEditForm(null); }}>Cancel</Button>
              <Button variant="contained" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, customer: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{' '}
            <strong>{deleteDialog.customer?.firstName} {deleteDialog.customer?.lastName}</strong>
            {' '}({deleteDialog.customer?.email})?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            This action cannot be undone. Customers with existing orders cannot be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, customer: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={tagDialog.open} onClose={() => setTagDialog({ open: false, customerId: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Add Tag</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Tag" value={newTag} onChange={e => setNewTag(e.target.value)}
            sx={{ mt: 2 }} placeholder="e.g., VIP, Wholesale, Regular" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialog({ open: false, customerId: null })}>Cancel</Button>
          <Button variant="contained" onClick={addTag}>Add Tag</Button>
        </DialogActions>
      </Dialog>

      {/* Add Credit Dialog */}
      <Dialog open={creditDialog.open} onClose={() => setCreditDialog({ open: false, customerId: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Add Credit</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Amount" type="number" value={creditAmount}
            onChange={e => setCreditAmount(e.target.value)} sx={{ mt: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditDialog({ open: false, customerId: null })}>Cancel</Button>
          <Button variant="contained" onClick={addCredit}>Add Credit</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCustomers;
