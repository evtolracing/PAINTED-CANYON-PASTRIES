import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, IconButton, InputAdornment, ToggleButton,
  ToggleButtonGroup, Card, CardContent, CardActionArea, Grid, Skeleton,
  Divider, Badge, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, List, ListItem, CircularProgress
} from '@mui/material';
import {
  Search, Add, Remove, Delete, ViewKanban, ViewList, FilterList, Refresh,
  AccessTime, Person, ShoppingBag, LocalShipping, DirectionsWalk,
  StorefrontOutlined, AttachMoney, CreditCard, Close
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const STATUS_COLUMNS = [
  { key: 'NEW', label: 'New', color: '#2196f3' },
  { key: 'CONFIRMED', label: 'Confirmed', color: '#c4956a' },
  { key: 'IN_PRODUCTION', label: 'In Production', color: '#ff9800' },
  { key: 'READY', label: 'Ready', color: '#4caf50' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: '#9c27b0' },
  { key: 'COMPLETED', label: 'Completed', color: '#7c8b6f' },
];

const fulfillmentIcon = (type) => {
  if (type === 'DELIVERY') return <LocalShipping fontSize="small" />;
  if (type === 'WALKIN') return <DirectionsWalk fontSize="small" />;
  return <ShoppingBag fontSize="small" />;
};

const OrderCard = ({ order, onClick }) => (
  <Card
    sx={{
      mb: 1.5, cursor: 'pointer',
      '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' },
      transition: 'all 0.2s',
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {order.orderNumber}
        </Typography>
        <Chip
          icon={fulfillmentIcon(order.fulfillmentType)}
          label={order.fulfillmentType}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 22 }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {order.customer
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : order.guestFirstName || 'Guest'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
          ${parseFloat(order.totalAmount).toFixed(2)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const AdminOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // ── Manual Order Dialog State ──
  const [manualOpen, setManualOpen] = useState(false);
  const [manualProducts, setManualProducts] = useState([]);
  const [manualCategories, setManualCategories] = useState([]);
  const [manualCatFilter, setManualCatFilter] = useState('all');
  const [manualSearch, setManualSearch] = useState('');
  const [manualCart, setManualCart] = useState([]);
  const [manualFulfillment, setManualFulfillment] = useState('PICKUP');
  const [manualPayment, setManualPayment] = useState('CASH');
  const [manualCustomer, setManualCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [manualNotes, setManualNotes] = useState('');
  const [manualPromo, setManualPromo] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualPromoApplied, setManualPromoApplied] = useState(false);
  const [manualPromoError, setManualPromoError] = useState('');
  const [manualDelivery, setManualDelivery] = useState({ address: '', zip: '', notes: '' });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualProductsLoading, setManualProductsLoading] = useState(false);

  // Open dialog when navigated with state.newOrder
  useEffect(() => {
    if (location.state?.newOrder) {
      handleManualOpen();
      // Clear the state so it doesn't re-open on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleManualOpen = async () => {
    setManualOpen(true);
    if (manualProducts.length === 0) {
      setManualProductsLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          api.get('/products?limit=200'),
          api.get('/categories'),
        ]);
        setManualProducts((pRes.data.data || []).filter(p => p.isActive));
        setManualCategories(cRes.data.data || []);
      } catch { /* ignore */ }
      finally { setManualProductsLoading(false); }
    }
  };

  const handleManualClose = () => {
    setManualOpen(false);
    setManualCart([]);
    setManualFulfillment('PICKUP');
    setManualPayment('CASH');
    setManualCustomer({ firstName: '', lastName: '', email: '', phone: '' });
    setManualNotes('');
    setManualPromo('');
    setManualDiscount(0);
    setManualPromoApplied(false);
    setManualPromoError('');
    setManualDelivery({ address: '', zip: '', notes: '' });
  };

  const addToManualCart = (product) => {
    setManualCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1, unitPrice: Number(product.basePrice) }];
    });
  };

  const updateManualQty = (productId, delta) => {
    setManualCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromManualCart = (productId) => {
    setManualCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const manualSubtotal = manualCart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const manualTaxRate = 0.0825;
  const manualDeliveryFee = manualFulfillment === 'DELIVERY' ? 5.0 : 0;
  const manualTaxable = manualSubtotal - manualDiscount;
  const manualTax = Math.round(manualTaxable * manualTaxRate * 100) / 100;
  const manualTotal = Math.round((manualTaxable + manualTax + manualDeliveryFee) * 100) / 100;

  const handleManualApplyPromo = async () => {
    if (!manualPromo.trim()) return;
    try {
      setManualPromoError('');
      const { data } = await api.post('/promos/validate', { code: manualPromo, subtotal: manualSubtotal });
      setManualDiscount(data.data.discount || 0);
      setManualPromoApplied(true);
    } catch (err) {
      setManualPromoError(err.response?.data?.error?.message || 'Invalid promo code');
      setManualDiscount(0);
      setManualPromoApplied(false);
    }
  };

  const handleManualSubmit = async () => {
    if (manualCart.length === 0) { showSnackbar('Add at least one item', 'error'); return; }
    if (manualFulfillment === 'DELIVERY' && !manualDelivery.address) { showSnackbar('Delivery address required', 'error'); return; }
    setManualSubmitting(true);
    try {
      const orderData = {
        fulfillmentType: manualFulfillment,
        paymentMethod: manualPayment,
        items: manualCart.map(i => ({
          productId: i.product.id,
          variantId: null,
          quantity: i.quantity,
          addons: [],
        })),
        tipAmount: 0,
        productionNotes: manualNotes || null,
        source: 'phone',
        isManualEntry: true,
        ...(manualPromo && { promoCode: manualPromo }),
        ...(manualCustomer.email && { guestEmail: manualCustomer.email }),
        ...(manualCustomer.firstName && { guestFirstName: manualCustomer.firstName }),
        ...(manualCustomer.lastName && { guestLastName: manualCustomer.lastName }),
        ...(manualCustomer.phone && { guestPhone: manualCustomer.phone }),
        ...(manualFulfillment === 'DELIVERY' && {
          deliveryAddress: manualDelivery.address,
          deliveryZip: manualDelivery.zip,
          deliveryNotes: manualDelivery.notes,
        }),
      };

      await api.post('/orders', orderData);
      showSnackbar('Manual order created successfully!', 'success');
      handleManualClose();
      fetchOrders();
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create order', 'error');
    } finally {
      setManualSubmitting(false);
    }
  };

  const filteredManualProducts = manualProducts.filter(p => {
    const matchesCat = manualCatFilter === 'all' || p.categoryId === manualCatFilter;
    const matchesSearch = !manualSearch || p.name.toLowerCase().includes(manualSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200, sortBy: 'createdAt', sortDir: 'desc' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (fulfillmentFilter) params.fulfillmentType = fulfillmentFilter;
      if (dateFilter) {
        params.startDate = dateFilter;
        const end = new Date(dateFilter);
        end.setDate(end.getDate() + 1);
        params.endDate = end.toISOString().slice(0, 10);
      }
      const { data } = await api.get('/orders', { params });
      setOrders(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fulfillmentFilter, dateFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const ordersByStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = orders.filter(o => o.status === col.key);
    return acc;
  }, {});

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
          Orders
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={handleManualOpen}>
            New Manual Order
          </Button>
          <IconButton onClick={fetchOrders}><Refresh /></IconButton>
        </Box>
      </Box>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            type="date"
            size="small"
            label="Date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {STATUS_COLUMNS.map(s => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
              <MenuItem value="REFUNDED">Refunded</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Fulfillment</InputLabel>
            <Select value={fulfillmentFilter} label="Fulfillment" onChange={e => setFulfillmentFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PICKUP">Pickup</MenuItem>
              <MenuItem value="DELIVERY">Delivery</MenuItem>
              <MenuItem value="WALKIN">Walk-in</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ ml: 'auto' }}>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
              <ToggleButton value="kanban"><ViewKanban fontSize="small" /></ToggleButton>
              <ToggleButton value="list"><ViewList fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <Box key={i} sx={{ flex: 1 }}>
              <Skeleton height={40} sx={{ mb: 1 }} />
              {[1, 2, 3].map(j => <Skeleton key={j} height={120} sx={{ mb: 1, borderRadius: 2 }} />)}
            </Box>
          ))}
        </Box>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 500 }}>
          {STATUS_COLUMNS.map(col => (
            <Box key={col.key} sx={{ minWidth: 260, maxWidth: 300, flex: '0 0 260px' }}>
              <Paper sx={{ p: 1.5, mb: 1, bgcolor: col.color + '15', borderTop: `3px solid ${col.color}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {col.label}
                  </Typography>
                  <Badge badgeContent={ordersByStatus[col.key]?.length || 0} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }} />
                </Box>
              </Paper>
              <Box sx={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', pr: 0.5 }}>
                {(ordersByStatus[col.key] || []).length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 4 }}>
                    No orders
                  </Typography>
                ) : (
                  (ordersByStatus[col.key] || []).map(order => (
                    <OrderCard key={order.id} order={order} onClick={() => navigate(`/admin/orders/${order.id}`)} />
                  ))
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        /* List View */
        <Paper>
          {orders.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <ShoppingBag sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">No orders found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#faf7f2' }}>
                    {['Order #', 'Customer', 'Items', 'Total', 'Type', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6d4c41', borderBottom: '1px solid #ebe0cc' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #f5efe5' }}>{order.orderNumber}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f5efe5' }}>
                        {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : order.guestFirstName || 'Guest'}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f5efe5' }}>{order.items?.length || 0}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #f5efe5' }}>${parseFloat(order.totalAmount).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f5efe5' }}>
                        <Chip icon={fulfillmentIcon(order.fulfillmentType)} label={order.fulfillmentType} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f5efe5' }}>
                        <Chip label={order.status.replace(/_/g, ' ')} size="small"
                          sx={{ bgcolor: (STATUS_COLUMNS.find(s => s.key === order.status)?.color || '#999') + '20', color: STATUS_COLUMNS.find(s => s.key === order.status)?.color || '#999', fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f5efe5' }}>
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Paper>
      )}
      {/* ── Manual Order Dialog ── */}
      <Dialog open={manualOpen} onClose={handleManualClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>New Manual Order</Typography>
            <IconButton onClick={handleManualClose}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Left: Product Selection */}
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Products</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <TextField size="small" placeholder="Search products..." value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                  sx={{ flex: 1 }} />
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label="All" size="small" onClick={() => setManualCatFilter('all')}
                  color={manualCatFilter === 'all' ? 'primary' : 'default'}
                  variant={manualCatFilter === 'all' ? 'filled' : 'outlined'} />
                {manualCategories.map(c => (
                  <Chip key={c.id} label={c.name} size="small" onClick={() => setManualCatFilter(c.id)}
                    color={manualCatFilter === c.id ? 'primary' : 'default'}
                    variant={manualCatFilter === c.id ? 'filled' : 'outlined'} />
                ))}
              </Stack>
              {manualProductsLoading ? <CircularProgress size={32} sx={{ display: 'block', mx: 'auto', my: 4 }} /> : (
                <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5 }}>
                  <Grid container spacing={1}>
                    {filteredManualProducts.map(p => (
                      <Grid item xs={6} sm={4} key={p.id}>
                        <Paper onClick={() => addToManualCart(p)} sx={{
                          p: 1.5, cursor: 'pointer', textAlign: 'center', borderRadius: 2,
                          border: '1px solid', borderColor: 'divider', transition: 'all 0.15s',
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(196,149,106,0.04)' },
                          '&:active': { transform: 'scale(0.97)' },
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>{p.name}</Typography>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>${Number(p.basePrice).toFixed(2)}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                    {filteredManualProducts.length === 0 && (
                      <Grid item xs={12}><Typography color="text.secondary" align="center" sx={{ py: 3 }}>No products found</Typography></Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Grid>
            {/* Right: Cart & Details */}
            <Grid item xs={12} md={5}>
              {/* Cart */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Cart ({manualCart.reduce((s, i) => s + i.quantity, 0)} items)</Typography>
              {manualCart.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Click a product to add it</Typography>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ mb: 2, maxHeight: 180, overflowY: 'auto' }}>
                  <List dense disablePadding>
                    {manualCart.map(item => (
                      <ListItem key={item.product.id} sx={{ px: 1.5, py: 0.75 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product.name}</Typography>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>${(item.unitPrice * item.quantity).toFixed(2)}</Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconButton size="small" onClick={() => updateManualQty(item.product.id, -1)}><Remove fontSize="small" /></IconButton>
                          <Typography sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateManualQty(item.product.id, 1)}><Add fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => removeFromManualCart(item.product.id)}><Delete fontSize="small" /></IconButton>
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              {/* Fulfillment */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Fulfillment</Typography>
              <ToggleButtonGroup value={manualFulfillment} exclusive onChange={(e, v) => v && setManualFulfillment(v)} fullWidth size="small" sx={{ mb: 1.5 }}>
                <ToggleButton value="WALKIN"><DirectionsWalk sx={{ mr: 0.5, fontSize: 16 }} /> Walk-in</ToggleButton>
                <ToggleButton value="PICKUP"><StorefrontOutlined sx={{ mr: 0.5, fontSize: 16 }} /> Pickup</ToggleButton>
                <ToggleButton value="DELIVERY"><LocalShipping sx={{ mr: 0.5, fontSize: 16 }} /> Delivery</ToggleButton>
              </ToggleButtonGroup>

              {manualFulfillment === 'DELIVERY' && (
                <Stack spacing={1} sx={{ mb: 1.5 }}>
                  <TextField size="small" fullWidth label="Delivery Address *" value={manualDelivery.address}
                    onChange={e => setManualDelivery(p => ({ ...p, address: e.target.value }))} />
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="ZIP" value={manualDelivery.zip}
                      onChange={e => setManualDelivery(p => ({ ...p, zip: e.target.value }))} sx={{ width: 120 }} />
                    <TextField size="small" fullWidth label="Delivery Notes" value={manualDelivery.notes}
                      onChange={e => setManualDelivery(p => ({ ...p, notes: e.target.value }))} />
                  </Stack>
                </Stack>
              )}

              {/* Payment */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Payment</Typography>
              <ToggleButtonGroup value={manualPayment} exclusive onChange={(e, v) => v && setManualPayment(v)} fullWidth size="small" sx={{ mb: 1.5 }}>
                <ToggleButton value="CASH"><AttachMoney sx={{ mr: 0.5, fontSize: 16 }} /> Cash</ToggleButton>
                <ToggleButton value="STRIPE_CARD"><CreditCard sx={{ mr: 0.5, fontSize: 16 }} /> Card</ToggleButton>
                <ToggleButton value="COMP">Comp</ToggleButton>
              </ToggleButtonGroup>

              {/* Customer */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Customer (optional)</Typography>
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                <Stack direction="row" spacing={1}>
                  <TextField size="small" label="First Name" value={manualCustomer.firstName}
                    onChange={e => setManualCustomer(p => ({ ...p, firstName: e.target.value }))} fullWidth />
                  <TextField size="small" label="Last Name" value={manualCustomer.lastName}
                    onChange={e => setManualCustomer(p => ({ ...p, lastName: e.target.value }))} fullWidth />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField size="small" label="Email" type="email" value={manualCustomer.email}
                    onChange={e => setManualCustomer(p => ({ ...p, email: e.target.value }))} fullWidth />
                  <TextField size="small" label="Phone" value={manualCustomer.phone}
                    onChange={e => setManualCustomer(p => ({ ...p, phone: e.target.value }))} sx={{ width: 160 }} />
                </Stack>
              </Stack>

              {/* Promo */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <TextField size="small" fullWidth placeholder="Promo code" value={manualPromo}
                  onChange={e => { setManualPromo(e.target.value); setManualPromoApplied(false); }}
                  error={!!manualPromoError} helperText={manualPromoError || (manualPromoApplied ? `-$${manualDiscount.toFixed(2)}` : '')}
                  disabled={manualPromoApplied} />
                <Button variant="outlined" size="small" sx={{ minWidth: 72 }}
                  onClick={manualPromoApplied ? () => { setManualPromo(''); setManualDiscount(0); setManualPromoApplied(false); setManualPromoError(''); } : handleManualApplyPromo}
                  disabled={!manualPromo.trim() && !manualPromoApplied}>
                  {manualPromoApplied ? 'Clear' : 'Apply'}
                </Button>
              </Stack>

              {/* Notes */}
              <TextField size="small" fullWidth label="Production Notes" multiline rows={2}
                value={manualNotes} onChange={e => setManualNotes(e.target.value)} sx={{ mb: 1.5 }} />

              {/* Totals */}
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>${manualSubtotal.toFixed(2)}</Typography>
                  </Box>
                  {manualDiscount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Discount</Typography>
                      <Typography variant="body2" color="success.main">-${manualDiscount.toFixed(2)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Tax (8.25%)</Typography>
                    <Typography variant="body2">${manualTax.toFixed(2)}</Typography>
                  </Box>
                  {manualDeliveryFee > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Delivery Fee</Typography>
                      <Typography variant="body2">${manualDeliveryFee.toFixed(2)}</Typography>
                    </Box>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total</Typography>
                    <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700 }}>${manualTotal.toFixed(2)}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleManualClose}>Cancel</Button>
          <Button variant="contained" size="large" onClick={handleManualSubmit}
            disabled={manualSubmitting || manualCart.length === 0}
            sx={{ minWidth: 180 }}>
            {manualSubmitting ? <CircularProgress size={24} color="inherit" /> : `Create Order · $${manualTotal.toFixed(2)}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminOrders;
