import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Chip, IconButton,
  InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Collapse, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Divider
} from '@mui/material';
import {
  Search, Refresh, Person, ExpandMore, ExpandLess, Add, AttachMoney,
  LocalOffer, ShoppingBag
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
      await api.put(`/customers/${tagDialog.customerId}/tags`, { tag: newTag.trim() });
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
      await api.put(`/customers/${creditDialog.customerId}/credit`, { amount: parseFloat(creditAmount) });
      showSnackbar('Credit added', 'success');
      setCreditDialog({ open: false, customerId: null });
      setCreditAmount('');
      fetchCustomers();
    } catch (err) {
      showSnackbar('Failed to add credit', 'error');
    }
  };

  // Collect all tags for filter
  const allTags = [...new Set(customers.flatMap(c => c.tags || []))];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Customers</Typography>
        <IconButton onClick={fetchCustomers}><Refresh /></IconButton>
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
                                    <Button size="small" variant="outlined" startIcon={<LocalOffer />}
                                      onClick={(e) => { e.stopPropagation(); setTagDialog({ open: true, customerId: customer.id }); }}>
                                      Add Tag
                                    </Button>
                                    <Button size="small" variant="outlined" startIcon={<AttachMoney />}
                                      onClick={(e) => { e.stopPropagation(); setCreditDialog({ open: true, customerId: customer.id }); }}>
                                      Add Credit
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
