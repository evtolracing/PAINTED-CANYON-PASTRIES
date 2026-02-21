import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Stack, Grid, Button, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, useMediaQuery, useTheme, Card, CardContent,
} from '@mui/material';
import {
  Receipt, Refresh, ShoppingCart, ArrowForward,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';

const statusColors = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY: 'success',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/my');
        setOrders(data.data || data || []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  const handleReorder = (order) => {
    if (!order.items?.length) return;
    order.items.forEach((item) => {
      if (item.product) {
        addItem(item.product, item.variant || null, item.quantity);
      }
    });
    showSnackbar('Items added to your cart!', 'success');
    navigate('/cart');
  };

  if (!user) return null;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography variant="h2">Order History</Typography>
          <Button component={Link} to="/shop" variant="outlined" startIcon={<ShoppingCart />} sx={{ borderRadius: 2 }}>
            Shop Now
          </Button>
        </Stack>

        {loading ? (
          <Stack spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={80} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : orders.length === 0 ? (
          <Paper elevation={1} sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
            <Receipt sx={{ fontSize: 64, color: 'sandstone.300', mb: 2 }} />
            <Typography variant="h5" gutterBottom>No orders yet</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your order history will appear here once you place your first order.
            </Typography>
            <Button component={Link} to="/shop" variant="contained" sx={{ borderRadius: 2 }}>
              Start Shopping
            </Button>
          </Paper>
        ) : isMobile ? (
          /* Mobile: Cards */
          <Stack spacing={2}>
            {orders.map((order) => (
              <Card key={order.id} elevation={1} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      #{order.orderNumber}
                    </Typography>
                    <Chip
                      label={order.status}
                      size="small"
                      color={statusColors[order.status] || 'default'}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {order.items?.map((item) =>
                      `${item.quantity}× ${item.product?.name || item.productName || 'Item'}`
                    ).join(', ') || 'Items unavailable'}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" color="primary.main" fontWeight={700}>
                      ${Number(order.total || 0).toFixed(2)}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={() => handleReorder(order)}
                      sx={{ borderRadius: 2 }}
                    >
                      Reorder
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          /* Desktop: Table */
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'sandstone.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        #{order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" noWrap>
                        {order.items?.map((item) =>
                          `${item.quantity}× ${item.product?.name || item.productName || 'Item'}`
                        ).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        size="small"
                        color={statusColors[order.status] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                        ${Number(order.total || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={() => handleReorder(order)}
                        sx={{ borderRadius: 2 }}
                      >
                        Reorder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default OrderHistoryPage;
