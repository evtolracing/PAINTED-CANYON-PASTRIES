import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Button, Paper, TextField, IconButton, Chip,
  Stack, Dialog, DialogTitle, DialogContent, DialogActions, Avatar,
  Divider, ToggleButton, ToggleButtonGroup, InputAdornment, List,
  ListItem, CircularProgress
} from '@mui/material';
import {
  Search, Add, Remove, Delete, LocalShipping, StorefrontOutlined,
  DirectionsWalk, CreditCard, AttachMoney, Close, Print, ArrowBack,
  Person, Lock
} from '@mui/icons-material';
import api from '../../services/api';

const POSScreen = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [staffUser, setStaffUser] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Product state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [fulfillment, setFulfillment] = useState('WALKIN');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Payment state
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [processing, setProcessing] = useState(false);

  // Success state
  const [orderComplete, setOrderComplete] = useState(null);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products?limit=200'),
        api.get('/categories'),
      ]);
      setProducts(productsRes.data.data || []);
      setCategories(categoriesRes.data.data || []);
    } catch {
      // Use empty state
    } finally {
      setLoading(false);
    }
  };

  // PIN Login
  const handlePinLogin = async () => {
    try {
      setPinError('');
      const { data } = await api.post('/pos/pin-login', { pin });
      // Store the POS token so api.js interceptor attaches it
      localStorage.setItem('accessToken', data.data.token);
      setStaffUser(data.data.user);
      setAuthenticated(true);
    } catch {
      setPinError('Invalid PIN');
    }
  };

  const handlePinKey = (key) => {
    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((p) => p + key);
    }
  };

  // Cart functions
  const addToCart = useCallback((product, variant = null) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.variant?.id === variant?.id
      );
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex].quantity += 1;
        return newItems;
      }
      return [...prev, {
        id: `${product.id}-${variant?.id || 'base'}-${Date.now()}`,
        product,
        variant,
        quantity: 1,
        unitPrice: variant ? Number(variant.price) : Number(product.basePrice),
      }];
    });
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => item.id === itemId ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearCart = () => {
    setCartItems([]);
    setPromoCode('');
    setDiscount(0);
    setPromoError('');
    setPromoApplied(false);
  };

  // Promo validation
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      setPromoError('');
      const { data } = await api.post('/promos/validate', { code: promoCode, subtotal });
      setDiscount(data.data.discount || 0);
      setPromoApplied(true);
    } catch (err) {
      setPromoError(err.response?.data?.error?.message || 'Invalid promo code');
      setDiscount(0);
      setPromoApplied(false);
    }
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxRate = 0.0825; // Match server tax rate
  const DELIVERY_FEE = 5.0;
  const deliveryFee = fulfillment === 'DELIVERY' ? DELIVERY_FEE : 0;
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * taxRate * 100) / 100;
  const total = Math.round((taxableAmount + tax + deliveryFee) * 100) / 100;
  const changeDue = cashTendered ? Math.max(0, Number(cashTendered) - total) : 0;

  // Place order
  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
      const orderData = {
        fulfillmentType: fulfillment,
        paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          variantId: item.variant?.id || null,
          quantity: item.quantity,
          addons: [],
        })),
        tipAmount: 0,
      };

      if (promoCode) orderData.promoCode = promoCode;

      const { data } = await api.post('/pos/orders', orderData);
      setOrderComplete(data.data);
      clearCart();
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Order failed. Please try again.';
      alert(msg);
    } finally {
      setProcessing(false);
      setPaymentDialog(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.isActive;
  });

  // ─── PIN LOGIN SCREEN ────────────────────────────────
  if (!authenticated) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3e2723 0%, #5d4037 100%)',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 360, width: '100%', textAlign: 'center', borderRadius: 4 }}>
          <Lock sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontFamily: '"Playfair Display", serif' }}>
            POS Login
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Enter your staff PIN
          </Typography>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              type="password"
              value={pin}
              placeholder="••••••"
              InputProps={{
                readOnly: true,
                sx: { textAlign: 'center', fontSize: '2rem', letterSpacing: 8 },
              }}
              error={!!pinError}
              helperText={pinError}
            />
          </Box>

          <Grid container spacing={1} sx={{ maxWidth: 240, mx: 'auto' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, 'back'].map((key) => (
              <Grid item xs={4} key={key}>
                <Button
                  fullWidth
                  variant={typeof key === 'number' ? 'outlined' : 'text'}
                  onClick={() => handlePinKey(String(key))}
                  sx={{
                    py: 1.5,
                    fontSize: typeof key === 'number' ? '1.2rem' : '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {key === 'clear' ? 'CLR' : key === 'back' ? '⌫' : key}
                </Button>
              </Grid>
            ))}
          </Grid>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handlePinLogin}
            disabled={pin.length < 4}
            sx={{ mt: 3 }}
          >
            Sign In
          </Button>
        </Paper>
      </Box>
    );
  }

  // ─── ORDER COMPLETE SCREEN ──────────────────────────
  if (orderComplete) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 480, borderRadius: 4 }}>
          <Typography sx={{ fontSize: '4rem', mb: 2 }}>✅</Typography>
          <Typography variant="h3" sx={{ mb: 1 }}>Order Complete</Typography>
          <Typography variant="h5" color="primary.main" sx={{ mb: 3 }}>
            #{orderComplete.orderNumber}
          </Typography>
          <Typography variant="h4" sx={{ mb: 1 }}>
            ${Number(orderComplete.totalAmount).toFixed(2)}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {orderComplete.fulfillmentType} · {orderComplete.paymentMethod === 'CASH' ? 'Cash' : 'Card'}
          </Typography>
          <Stack spacing={2}>
            <Button variant="contained" size="large" onClick={() => setOrderComplete(null)}>
              New Order
            </Button>
            <Button variant="outlined" startIcon={<Print />}>
              Print Receipt
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // ─── MAIN POS SCREEN ─────────────────────────────────
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left - Products */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid', borderColor: 'divider' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton component="a" href="/admin" size="small">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', flex: 1 }}>
            Point of Sale
          </Typography>
          <Chip
            icon={<Person />}
            label={staffUser?.firstName || 'Staff'}
            size="small"
            variant="outlined"
          />
          <TextField
            size="small"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
            }}
            sx={{ width: 220 }}
          />
        </Box>

        {/* Categories */}
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
          <Stack direction="row" spacing={1}>
            <Chip
              label="All"
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                onClick={() => setSelectedCategory(cat.id)}
                color={selectedCategory === cat.id ? 'primary' : 'default'}
                variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>

        {/* Product Grid */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {loading ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />
          ) : (
            <Grid container spacing={1.5}>
              {filteredProducts.map((product) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                  <Paper
                    onClick={() => addToCart(product)}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      textAlign: 'center',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(196,149,106,0.04)',
                      },
                      '&:active': { transform: 'scale(0.97)' },
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: 1.5,
                        bgcolor: '#faf7f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        mb: 1,
                      }}
                    >
                      🧁
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3 }} noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, mt: 0.5 }}>
                      ${Number(product.basePrice).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Right - Cart */}
      <Box sx={{ width: { xs: 300, lg: 380 }, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        {/* Fulfillment Type */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <ToggleButtonGroup
            value={fulfillment}
            exclusive
            onChange={(e, v) => v && setFulfillment(v)}
            fullWidth
            size="small"
          >
            <ToggleButton value="WALKIN">
              <DirectionsWalk sx={{ mr: 0.5, fontSize: 18 }} /> Walk-in
            </ToggleButton>
            <ToggleButton value="PICKUP">
              <StorefrontOutlined sx={{ mr: 0.5, fontSize: 18 }} /> Pickup
            </ToggleButton>
            <ToggleButton value="DELIVERY">
              <LocalShipping sx={{ mr: 0.5, fontSize: 18 }} /> Delivery
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {cartItems.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No items yet</Typography>
              <Typography variant="caption">Tap a product to add it</Typography>
            </Box>
          ) : (
            <List dense>
              {cartItems.map((item) => (
                <ListItem key={item.id} sx={{ px: 2, py: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {item.product.name}
                    </Typography>
                    {item.variant && (
                      <Typography variant="caption" color="text.secondary">
                        {item.variant.name}
                      </Typography>
                    )}
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton size="small" onClick={() => updateQuantity(item.id, -1)}>
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                      {item.quantity}
                    </Typography>
                    <IconButton size="small" onClick={() => updateQuantity(item.id, 1)}>
                      <Add fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => removeFromCart(item.id)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Promo Code */}
        <Box sx={{ px: 2, py: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(false); }}
              error={!!promoError}
              helperText={promoError || (promoApplied ? `Discount: -$${discount.toFixed(2)}` : '')}
              disabled={promoApplied}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={promoApplied ? () => { setPromoCode(''); setDiscount(0); setPromoApplied(false); setPromoError(''); } : handleApplyPromo}
              disabled={!promoCode.trim() && !promoApplied}
              sx={{ minWidth: 72 }}
            >
              {promoApplied ? 'Clear' : 'Apply'}
            </Button>
          </Stack>
        </Box>

        {/* Totals */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</Typography>
            </Box>
            {discount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="success.main">Discount</Typography>
                <Typography variant="body2" color="success.main">-${discount.toFixed(2)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Tax (8.25%)</Typography>
              <Typography variant="body2">${tax.toFixed(2)}</Typography>
            </Box>
            {deliveryFee > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Delivery Fee</Typography>
                <Typography variant="body2">${deliveryFee.toFixed(2)}</Typography>
              </Box>
            )}
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary.main">${total.toFixed(2)}</Typography>
            </Box>
          </Stack>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={cartItems.length === 0}
              onClick={() => setPaymentDialog(true)}
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              Charge ${total.toFixed(2)}
            </Button>
            <Button variant="outlined" size="small" fullWidth onClick={clearCart} disabled={cartItems.length === 0}>
              Clear Cart
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Payment</Typography>
            <IconButton onClick={() => setPaymentDialog(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h4" align="center" sx={{ my: 2, fontWeight: 700, color: 'primary.main' }}>
            ${total.toFixed(2)}
          </Typography>

          <ToggleButtonGroup
            value={paymentMethod}
            exclusive
            onChange={(e, v) => v && setPaymentMethod(v)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="CASH">
              <AttachMoney sx={{ mr: 0.5 }} /> Cash
            </ToggleButton>
            <ToggleButton value="STRIPE_CARD">
              <CreditCard sx={{ mr: 0.5 }} /> Card
            </ToggleButton>
          </ToggleButtonGroup>

          {paymentMethod === 'CASH' && (
            <Box>
              <TextField
                fullWidth
                label="Cash Tendered"
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              {cashTendered && Number(cashTendered) >= total && (
                <Paper sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                    Change: ${changeDue.toFixed(2)}
                  </Typography>
                </Paper>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {[5, 10, 20, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outlined"
                    size="small"
                    onClick={() => setCashTendered(String(amount))}
                  >
                    ${amount}
                  </Button>
                ))}
                <Button variant="outlined" size="small" onClick={() => setCashTendered(total.toFixed(2))}>
                  Exact
                </Button>
              </Stack>
            </Box>
          )}

          {paymentMethod === 'STRIPE_CARD' && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
              <CreditCard sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Present card on terminal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Stripe Terminal - mocked)
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            size="large"
            onClick={handlePlaceOrder}
            disabled={processing || (paymentMethod === 'CASH' && Number(cashTendered) < total)}
            sx={{ minWidth: 160 }}
          >
            {processing ? <CircularProgress size={24} color="inherit" /> : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POSScreen;
