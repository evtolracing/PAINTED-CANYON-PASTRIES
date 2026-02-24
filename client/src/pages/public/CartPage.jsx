import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Button, IconButton, Paper, Stack,
  Divider, TextField, Card, CardMedia, CardContent,
} from '@mui/material';
import {
  Add, Remove, Delete, ShoppingCart, ArrowBack, LocalOffer,
} from '@mui/icons-material';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';
import api from '../../services/api';

const CartPage = () => {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const { showSnackbar } = useSnackbar();
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [discount, setDiscount] = useState(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await api.post('/promos/validate', { code: promoCode, subtotal });
      setDiscount(data.data || data);
      showSnackbar('Promo code applied!', 'success');
    } catch {
      showSnackbar('Invalid or expired promo code.', 'error');
      setDiscount(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const discountAmount = discount
    ? discount.discount || (discount.type === 'PERCENTAGE'
      ? subtotal * (Number(discount.value) / 100)
      : Number(discount.value))
    : 0;

  const total = Math.max(0, subtotal - discountAmount);

  if (items.length === 0) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 5, md: 10 } }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <ShoppingCart sx={{ fontSize: 80, color: 'sandstone.300', mb: 2 }} />
          <Typography variant="h3" gutterBottom>Your cart is empty</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Looks like you haven't added any pastries yet. Let's fix that!
          </Typography>
          <Button component={Link} to="/shop" variant="contained" size="large" sx={{ borderRadius: 2 }}>
            Start Shopping
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Typography variant="h2" gutterBottom>Your Cart</Typography>

        <Grid container spacing={4}>
          {/* Cart Items */}
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {items.map((item) => (
                <Paper
                  key={item.id}
                  elevation={1}
                  sx={{ p: 2, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
                >
                  {/* Image */}
                  <Box
                    sx={{
                      width: { xs: 60, sm: 80 },
                      height: { xs: 60, sm: 80 },
                      borderRadius: 2,
                      bgcolor: 'sandstone.100',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {(item.product.images?.[0]?.url || item.product.imageUrl) ? (
                      <Box component="img" src={item.product.images?.[0]?.url || item.product.imageUrl} alt={item.product.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography sx={{ fontSize: '2rem' }}>🥐</Typography>
                    )}
                  </Box>

                  {/* Details */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {item.product.name}
                    </Typography>
                    {item.variant && (
                      <Typography variant="body2" color="text.secondary">{item.variant.name}</Typography>
                    )}
                    {item.addons?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        + {item.addons.map((a) => a.name).join(', ')}
                      </Typography>
                    )}
                  </Box>

                  {/* Quantity */}
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>
                      {item.quantity}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Stack>

                  {/* Price */}
                  <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 70, textAlign: 'right' }}>
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </Typography>

                  {/* Remove */}
                  <IconButton color="error" onClick={() => removeItem(item.id)} size="small">
                    <Delete fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          </Grid>

          {/* Summary */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h5" gutterBottom>Order Summary</Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1">Subtotal</Typography>
                  <Typography variant="body1" fontWeight={600}>${subtotal.toFixed(2)}</Typography>
                </Stack>

                {discount && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="success.main">Discount</Typography>
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      -${discountAmount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Estimated Total</Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={700}>
                    ${total.toFixed(2)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Tax and delivery fee calculated at checkout
                </Typography>
              </Stack>

              {/* Promo Code */}
              <Box sx={{ mt: 3 }}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    placeholder="Promo code"
                    size="small"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: <LocalOffer sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />,
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleApplyPromo}
                    disabled={promoLoading}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Apply
                  </Button>
                </Stack>
              </Box>

              <Stack spacing={1.5} sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  to="/checkout"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  Proceed to Checkout
                </Button>
                <Button
                  component={Link}
                  to="/shop"
                  variant="outlined"
                  fullWidth
                  startIcon={<ArrowBack />}
                  sx={{ borderRadius: 2 }}
                >
                  Continue Shopping
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CartPage;
