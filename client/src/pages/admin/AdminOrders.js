import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, IconButton, InputAdornment, ToggleButton,
  ToggleButtonGroup, Card, CardContent, CardActionArea, Grid, Skeleton,
  Divider, Badge
} from '@mui/material';
import {
  Search, Add, ViewKanban, ViewList, FilterList, Refresh,
  AccessTime, Person, ShoppingBag, LocalShipping, DirectionsWalk
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
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

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
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/orders', { state: { newOrder: true } })}>
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
    </Container>
  );
};

export default AdminOrders;
