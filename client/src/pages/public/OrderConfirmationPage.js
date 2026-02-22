import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Stack, Divider, Button, Chip, Skeleton,
} from '@mui/material';
import {
  CheckCircle, ShoppingBag, Home, Receipt,
} from '@mui/icons-material';
import api from '../../services/api';

const OrderConfirmationPage = () => {
  const { orderId: orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/by-number/${orderNumber}`);
        setOrder(data.data || data);
      } catch {
        // Still show a success state even if we can't fetch the order
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    if (orderNumber && orderNumber !== 'success') {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderNumber]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton width="60%" height={40} sx={{ mx: 'auto' }} />
        <Skeleton width="80%" height={24} sx={{ mx: 'auto', mt: 2 }} />
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 5, md: 8 } }}>
      <Container maxWidth="sm">
        {/* Success Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: 'rgba(124,139,111,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.05)' },
              },
            }}
          >
            <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
          </Box>
          <Typography variant="h2" gutterBottom>
            Order Confirmed!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
            Thank you for your order! We're already getting started on your pastries.
          </Typography>
        </Box>

        {/* Confetti decoration */}
        <Box sx={{ textAlign: 'center', fontSize: '2rem', mb: 3 }}>
          🎉 🧁 🎂 🥐 🍪 🎉
        </Box>

        {/* Order Details */}
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            {orderNumber && orderNumber !== 'success' && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Receipt color="primary" />
                <Typography variant="h6">Order #{orderNumber}</Typography>
              </Stack>
            )}

            {order && (
              <>
                {/* Items */}
                {order.items?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Items</Typography>
                    {order.items.map((item, idx) => (
                      <Stack key={idx} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                        <Typography variant="body2">
                          {item.quantity}× {item.product?.name || item.productName || 'Item'}
                          {item.variant && ` (${item.variant.name || item.variantName})`}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          ${Number(item.totalPrice || item.unitPrice * item.quantity || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                    ))}
                  </Box>
                )}

                <Divider />

                {/* Total */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={700}>
                    ${Number(order.totalAmount || 0).toFixed(2)}
                  </Typography>
                </Stack>

                <Divider />

                {/* Fulfillment */}
                <Box>
                  <Chip
                    label={order.fulfillmentType === 'DELIVERY' ? 'Delivery' : order.fulfillmentType === 'WALKIN' ? 'Walk-In' : 'Pickup'}
                    color="primary"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  {order.fulfillmentType === 'DELIVERY' && order.deliveryAddress && (
                    <Typography variant="body2" color="text.secondary">
                      {order.deliveryAddress}{order.deliveryZip ? ` ${order.deliveryZip}` : ''}
                    </Typography>
                  )}
                  {order.timeslot && (
                    <Typography variant="body2" color="text.secondary">
                      {order.timeslot.date ? new Date(order.timeslot.date).toLocaleDateString() : order.timeslot.label} — {order.timeslot.startTime} to {order.timeslot.endTime}
                    </Typography>
                  )}
                </Box>

                {/* Status */}
                {order.status && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip label={order.status} color="success" variant="outlined" size="small" />
                  </Box>
                )}
              </>
            )}
          </Stack>
        </Paper>

        {/* Actions */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
          <Button component={Link} to="/" variant="contained" startIcon={<Home />} sx={{ borderRadius: 2 }}>
            Back to Home
          </Button>
          <Button component={Link} to="/shop" variant="outlined" startIcon={<ShoppingBag />} sx={{ borderRadius: 2 }}>
            Continue Shopping
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default OrderConfirmationPage;
