import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Grid, Paper, Card, CardContent, TextField,
  Skeleton, Divider
} from '@mui/material';
import {
  TrendingUp, ShoppingBag, AttachMoney, Receipt
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const COLORS = ['#c4956a', '#3e2723', '#7c8b6f', '#d4a87e', '#a67c52', '#5d4037'];

const MetricCard = ({ title, value, icon, loading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>{title}</Typography>
          {loading ? <Skeleton width={100} height={40} /> : (
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>{value}</Typography>
          )}
        </Box>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const AdminAnalytics = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [fulfillment, setFulfillment] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [salesRes, topRes, fulfillRes] = await Promise.all([
        api.get('/analytics/sales', { params: { startDate, endDate } }),
        api.get('/analytics/top-products', { params: { startDate, endDate, limit: 10 } }),
        api.get('/analytics/fulfillment', { params: { startDate, endDate } }),
      ]);
      setSalesData(salesRes.data.data);
      setTopProducts(topRes.data.data || []);
      setFulfillment(fulfillRes.data.data);
    } catch (err) {
      showSnackbar('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [startDate, endDate]);

  const summary = salesData?.summary || {};
  const timeline = (salesData?.timeline || []).map(d => ({
    ...d,
    date: d.date?.slice(5) || d.date,
    revenue: Math.round(d.revenue * 100) / 100,
  }));

  const fulfillmentPie = fulfillment?.fulfillmentCounts
    ? Object.entries(fulfillment.fulfillmentCounts).map(([name, value]) => ({ name, value }))
    : [];

  const refundRate = fulfillment?.statusCounts?.REFUNDED && fulfillment?.totalOrders
    ? ((fulfillment.statusCounts.REFUNDED / fulfillment.totalOrders) * 100).toFixed(1)
    : '0.0';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField type="date" size="small" label="Start" value={startDate}
            onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" size="small" label="End" value={endDate}
            onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Total Revenue" value={`$${(summary.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={<AttachMoney />} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Total Orders" value={summary.orderCount || 0} icon={<ShoppingBag />} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Avg. Order Value" value={`$${(summary.averageOrderValue || 0).toFixed(2)}`} icon={<TrendingUp />} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Refund Rate" value={`${refundRate}%`} icon={<Receipt />} loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sales Over Time */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Sales Over Time</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            ) : timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe0cc" />
                  <XAxis dataKey="date" stroke="#6d4c41" fontSize={12} />
                  <YAxis stroke="#6d4c41" fontSize={12} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    formatter={(value, name) => [name === 'revenue' ? `$${value.toFixed(2)}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #ebe0cc' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#c4956a" strokeWidth={2} dot={{ fill: '#c4956a' }} />
                  <Line type="monotone" dataKey="orderCount" stroke="#7c8b6f" strokeWidth={2} dot={{ fill: '#7c8b6f' }} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data for this period</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Fulfillment Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Fulfillment Breakdown</Typography>
            {loading ? (
              <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
            ) : fulfillmentPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={fulfillmentPie} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {fulfillmentPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                <Typography color="text.secondary">No data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Top Products</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            ) : topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts.slice(0, 8).map(p => ({ name: p.product?.name?.slice(0, 20) || 'Unknown', revenue: p.totalRevenue, quantity: p.totalQuantity }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe0cc" />
                  <XAxis dataKey="name" stroke="#6d4c41" fontSize={11} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#6d4c41" fontSize={12} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(value, name) => [name === 'revenue' ? `$${value.toFixed(2)}` : value, name === 'revenue' ? 'Revenue' : 'Qty Sold']} />
                  <Bar dataKey="revenue" fill="#c4956a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No product data for this period</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* AOV Trend */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>AOV Trend</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timeline.map(d => ({
                  date: d.date,
                  aov: d.orderCount > 0 ? Math.round((d.revenue / d.orderCount) * 100) / 100 : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe0cc" />
                  <XAxis dataKey="date" stroke="#6d4c41" fontSize={11} />
                  <YAxis stroke="#6d4c41" fontSize={12} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'AOV']} />
                  <Line type="monotone" dataKey="aov" stroke="#3e2723" strokeWidth={2} dot={{ fill: '#3e2723' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                <Typography color="text.secondary">No data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminAnalytics;
