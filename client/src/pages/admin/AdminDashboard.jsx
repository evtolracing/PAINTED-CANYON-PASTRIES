import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Paper, Card, CardContent, CardActions,
  Button, Skeleton, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Divider, Avatar
} from '@mui/material';
import {
  ShoppingBag, AttachMoney, HourglassEmpty, Inventory2, Add,
  ArrowForward, Refresh, TrendingUp, LocalShipping, Storefront,
  PointOfSale
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const StatCard = ({ title, value, icon, color, subtitle, loading }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={40} />
          ) : (
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color || 'primary.main', width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayOrders: 0, revenue: 0, pendingOrders: 0, activeProducts: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [ordersRes, salesRes, productsRes] = await Promise.all([
        api.get('/orders', { params: { limit: 5, sortBy: 'createdAt', sortDir: 'desc' } }),
        api.get('/analytics/sales', { params: { startDate: new Date(Date.now() - 7 * 86400000).toISOString() } }),
        api.get('/products', { params: { limit: 1 } }),
      ]);

      const orders = ordersRes.data.data || [];
      const sales = salesRes.data.data || {};
      const productMeta = productsRes.data.meta || {};

      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = orders.filter(o => o.createdAt?.slice(0, 10) === today).length;
      const pendingOrders = orders.filter(o => ['NEW', 'CONFIRMED', 'IN_PRODUCTION'].includes(o.status)).length;

      setStats({
        todayOrders: sales.summary?.orderCount || todayOrders,
        revenue: `$${(sales.summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        pendingOrders,
        activeProducts: productMeta.total || 0,
      });

      setRecentOrders(orders.slice(0, 5));
      setChartData((sales.timeline || []).map(d => ({
        date: d.date?.slice(5) || d.date,
        revenue: d.revenue,
        orders: d.orderCount,
      })));
    } catch (err) {
      showSnackbar('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const statusColor = (status) => {
    const map = {
      NEW: 'info', CONFIRMED: 'primary', IN_PRODUCTION: 'warning',
      READY: 'success', OUT_FOR_DELIVERY: 'secondary', COMPLETED: 'success',
      REFUNDED: 'error', CANCELLED: 'default',
    };
    return map[status] || 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening today.
          </Typography>
        </Box>
        <IconButton onClick={fetchDashboard} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Orders"
            value={stats.todayOrders}
            icon={<ShoppingBag />}
            color="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Revenue (7d)"
            value={stats.revenue}
            icon={<AttachMoney />}
            color="success.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<HourglassEmpty />}
            color="warning.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Products"
            value={stats.activeProducts}
            icon={<Inventory2 />}
            color="secondary.main"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Revenue (Last 7 Days)
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe0cc" />
                  <XAxis dataKey="date" stroke="#6d4c41" fontSize={12} />
                  <YAxis stroke="#6d4c41" fontSize={12} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    formatter={(value, name) => [name === 'revenue' ? `$${value.toFixed(2)}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #ebe0cc' }}
                  />
                  <Bar dataKey="revenue" fill="#c4956a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'text.secondary' }}>
                <Typography>No data available for this period</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button variant="contained" startIcon={<Add />} fullWidth onClick={() => navigate('/admin/orders', { state: { newOrder: true } })}>
                New Manual Order
              </Button>
              <Button variant="outlined" startIcon={<Inventory2 />} fullWidth onClick={() => navigate('/admin/products/new')}>
                Add Product
              </Button>
              <Button variant="outlined" startIcon={<PointOfSale />} fullWidth onClick={() => navigate('/pos')}>
                Open POS
              </Button>
              <Button variant="outlined" startIcon={<TrendingUp />} fullWidth onClick={() => navigate('/admin/analytics')}>
                View Analytics
              </Button>
              <Button variant="outlined" startIcon={<LocalShipping />} fullWidth onClick={() => navigate('/admin/inventory')}>
                Check Inventory
              </Button>
              <Button variant="outlined" startIcon={<Storefront />} fullWidth onClick={() => navigate('/')}>
                View Storefront
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Orders */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Orders
              </Typography>
              <Button endIcon={<ArrowForward />} onClick={() => navigate('/admin/orders')}>
                View All
              </Button>
            </Box>
            {loading ? (
              <Box>
                {[1, 2, 3].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
              </Box>
            ) : recentOrders.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No orders yet. They'll appear here once customers start ordering.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map(order => (
                      <TableRow key={order.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/orders/${order.id}`)}>
                        <TableCell sx={{ fontWeight: 600 }}>{order.orderNumber}</TableCell>
                        <TableCell>
                          {order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`
                            : order.guestFirstName
                              ? `${order.guestFirstName} ${order.guestLastName || ''}`
                              : 'Guest'}
                        </TableCell>
                        <TableCell>{order.items?.length || 0}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>${parseFloat(order.totalAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={order.status.replace(/_/g, ' ')} color={statusColor(order.status)} size="small" />
                        </TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small"><ArrowForward fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
