import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Button, Paper, Stack, Stepper, Step,
  StepLabel, TextField, RadioGroup, Radio, FormControlLabel, FormControl,
  FormLabel, Divider, Chip, Alert, CircularProgress, ToggleButton,
  ToggleButtonGroup, Skeleton,
} from '@mui/material';
import {
  LocalShipping, Storefront, Schedule, CheckCircle, ArrowBack,
  ArrowForward, CreditCard,
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';

const STEPS = ['Fulfillment', 'Time Slot', 'Payment', 'Review & Place Order'];
const TIP_OPTIONS = [0, 2, 5, 10];
const TAX_RATE = 0.0825;
const DELIVERY_FEE = 5.00;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      '::placeholder': { color: '#aab7c4' },
      padding: '12px',
    },
    invalid: { color: '#e53e3e' },
  },
};

/* ─── Inner checkout form (has access to useStripe / useElements) ─── */
const CheckoutForm = ({ stripeReady }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { showSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState('');
  const orderCompleteRef = React.useRef(false);

  // Step 1 - Fulfillment
  const [fulfillment, setFulfillment] = useState('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '', city: '', state: '', zip: '',
  });
  const [zipError, setZipError] = useState('');

  // Step 2 - Timeslot
  const [timeslots, setTimeslots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Step 3 - Payment
  const [tip, setTip] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoData, setPromoData] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Guest info
  const [guestInfo, setGuestInfo] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  // Step 4 - Notes
  const [notes, setNotes] = useState('');

  // Redirect to cart ONLY on initial mount if cart is empty (not after clearCart)
  useEffect(() => {
    if (items.length === 0 && !orderCompleteRef.current) {
      navigate('/cart');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeStep === 1) {
      const fetchSlots = async () => {
        setSlotsLoading(true);
        try {
          const { data } = await api.get('/timeslots/available', {
            params: { type: fulfillment },
          });
          setTimeslots(data.data || data || []);
        } catch {
          setTimeslots([]);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchSlots();
    }
  }, [activeStep, fulfillment]);

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await api.post('/promos/validate', { code: promoCode, subtotal });
      const promo = data.data || data;
      setPromoData(promo);
      setPromoDiscount(promo.discount || 0);
      showSnackbar('Promo code applied!', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || 'Invalid or expired promo code.', 'error');
      setPromoData(null);
      setPromoDiscount(0);
    } finally {
      setPromoLoading(false);
    }
  };

  const validateStep = () => {
    if (activeStep === 0) {
      if (!user && (!guestInfo.firstName || !guestInfo.email)) {
        showSnackbar('Please provide your name and email.', 'error');
        return false;
      }
      if (!user && guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
        showSnackbar('Please enter a valid email address.', 'error');
        return false;
      }
      if (fulfillment === 'DELIVERY') {
        const { street, city, state, zip } = deliveryAddress;
        if (!street || !city || !state || !zip) {
          showSnackbar('Please fill in your delivery address.', 'error');
          return false;
        }
        if (!/^\d{5}(-\d{4})?$/.test(zip)) {
          setZipError('Enter a valid ZIP code');
          return false;
        }
        setZipError('');
      }
    }
    if (activeStep === 1 && !selectedSlot && timeslots.length > 0) {
      showSnackbar('Please select a time slot.', 'error');
      return false;
    }
    if (activeStep === 2 && stripeReady) {
      if (!cardComplete) {
        showSnackbar('Please enter your card details.', 'error');
        return false;
      }
      if (cardError) {
        showSnackbar('Please fix the card error before continuing.', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setActiveStep((s) => s + 1);
  };

  const handleBack = () => setActiveStep((s) => s - 1);

  // Calculate totals matching server logic
  const deliveryFee = fulfillment === 'DELIVERY' ? DELIVERY_FEE : 0;
  const taxableAmount = subtotal - promoDiscount;
  const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const total = Math.round((taxableAmount + taxAmount + deliveryFee + tip) * 100) / 100;

  const handlePlaceOrder = async () => {
    if (!stripe || !elements) {
      showSnackbar('Payment system is loading. Please wait a moment and try again.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const deliveryStr = fulfillment === 'DELIVERY'
        ? `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zip}`
        : undefined;

      const orderData = {
        items: items.map((item) => ({
          productId: item.product.id,
          variantId: item.variant?.id || null,
          quantity: item.quantity,
          addons: item.addons?.map((a) => ({ addonId: a.id || a.addonId })) || [],
          notes: item.notes || undefined,
        })),
        fulfillmentType: fulfillment,
        scheduledDate: selectedSlot?.date || undefined,
        timeslotId: selectedSlot?.id || undefined,
        tipAmount: tip,
        productionNotes: notes || undefined,
        promoCode: promoCode || undefined,
        paymentMethod: 'STRIPE_CARD',
        deliveryAddress: deliveryStr,
        deliveryZip: fulfillment === 'DELIVERY' ? deliveryAddress.zip : undefined,
        deliveryNotes: undefined,
        guestEmail: !user ? guestInfo.email : undefined,
        guestFirstName: !user ? guestInfo.firstName : undefined,
        guestLastName: !user ? guestInfo.lastName : undefined,
        guestPhone: !user ? guestInfo.phone : undefined,
      };

      // Step 1: Create order on server (also creates Stripe PaymentIntent)
      const { data } = await api.post('/orders', orderData);
      const clientSecret = data.data?.clientSecret;
      const orderNum = data.data?.order?.orderNumber || data.data?.orderNumber || 'success';

      // Step 2: clientSecret MUST be returned for card payments
      if (!clientSecret) {
        showSnackbar('Payment could not be initiated. Please try again or contact us.', 'error');
        return;
      }

      // Step 3: Confirm the payment with Stripe (handles 3D Secure etc.)
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : `${guestInfo.firstName} ${guestInfo.lastName}`.trim(),
            email: user?.email || guestInfo.email || undefined,
          },
        },
      });

      if (stripeError) {
        // Payment failed — order exists but is unpaid, server webhook will handle cleanup
        showSnackbar(stripeError.message || 'Payment failed. Please try again.', 'error');
        return;
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
        // Payment successful — mark order complete and navigate
        orderCompleteRef.current = true;
        clearCart();
        navigate(`/order-confirmation/${orderNum}`);
      } else if (paymentIntent.status === 'requires_action') {
        // 3D Secure or additional authentication may be needed — Stripe SDK handles it
        // If we reach here, confirmCardPayment should have already handled the modal
        showSnackbar('Additional authentication required. Please complete the verification.', 'info');
      } else {
        showSnackbar('Payment was not completed. Please try again.', 'error');
      }
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Typography variant="h2" gutterBottom>Checkout</Typography>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          {/* Step 1: Fulfillment */}
          {activeStep === 0 && (
            <Stack spacing={3}>
              <Typography variant="h5">Fulfillment Method</Typography>

              {!user && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Your Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="First Name" fullWidth required value={guestInfo.firstName}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, firstName: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Last Name" fullWidth value={guestInfo.lastName}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, lastName: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Email" type="email" fullWidth required value={guestInfo.email}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, email: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Phone" fullWidth value={guestInfo.phone}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, phone: e.target.value }))} />
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Already have an account? <Typography component={Link} to="/login" color="primary.main" sx={{ fontWeight: 600 }}>Log in</Typography> for a faster checkout.
                  </Alert>
                </Box>
              )}

              <FormControl component="fieldset">
                <ToggleButtonGroup
                  value={fulfillment}
                  exclusive
                  onChange={(_, val) => { if (val) { setFulfillment(val); setSelectedSlot(null); } }}
                  sx={{ gap: 2 }}
                >
                  <ToggleButton value="PICKUP" sx={{ px: 4, py: 2, borderRadius: '12px !important', border: '2px solid', borderColor: 'divider', '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', borderColor: 'primary.main' } }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Storefront />
                      <Typography variant="body2" fontWeight={600}>Pickup</Typography>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="DELIVERY" sx={{ px: 4, py: 2, borderRadius: '12px !important', border: '2px solid', borderColor: 'divider', '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', borderColor: 'primary.main' } }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <LocalShipping />
                      <Typography variant="body2" fontWeight={600}>Delivery</Typography>
                    </Stack>
                  </ToggleButton>
                </ToggleButtonGroup>
              </FormControl>

              {fulfillment === 'DELIVERY' && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Delivery Address</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField label="Street Address" fullWidth required value={deliveryAddress.street}
                        onChange={(e) => setDeliveryAddress((p) => ({ ...p, street: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField label="City" fullWidth required value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress((p) => ({ ...p, city: e.target.value }))} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="State" fullWidth required value={deliveryAddress.state}
                        onChange={(e) => setDeliveryAddress((p) => ({ ...p, state: e.target.value }))} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField label="ZIP Code" fullWidth required value={deliveryAddress.zip}
                        error={!!zipError} helperText={zipError}
                        onChange={(e) => { setDeliveryAddress((p) => ({ ...p, zip: e.target.value })); setZipError(''); }} />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Stack>
          )}

          {/* Step 2: Time Slot */}
          {activeStep === 1 && (
            <Stack spacing={3}>
              <Typography variant="h5">Select a Time Slot</Typography>
              {slotsLoading ? (
                <Stack spacing={1}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={56} sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : timeslots.length === 0 ? (
                <Alert severity="info">No scheduled time slots available. Your order will be processed as soon as possible.</Alert>
              ) : (
                <RadioGroup value={selectedSlot?.id || ''} onChange={(e) => {
                  const slot = timeslots.find((s) => String(s.id) === e.target.value);
                  setSelectedSlot(slot);
                }}>
                  <Grid container spacing={1}>
                    {timeslots.map((slot) => (
                      <Grid item xs={12} sm={6} key={slot.id}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2, borderRadius: 2, cursor: 'pointer',
                            borderColor: selectedSlot?.id === slot.id ? 'primary.main' : 'divider',
                            borderWidth: selectedSlot?.id === slot.id ? 2 : 1,
                            bgcolor: selectedSlot?.id === slot.id ? 'rgba(196,149,106,0.08)' : 'transparent',
                            '&:hover': { borderColor: 'primary.light' },
                          }}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <FormControlLabel
                            value={String(slot.id)}
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {slot.date || slot.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {slot.startTime} — {slot.endTime}
                                  {slot.spotsLeft != null && ` • ${slot.spotsLeft} spots left`}
                                </Typography>
                              </Box>
                            }
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              )}
            </Stack>
          )}

          {/* Step 3: Payment — entire section kept in DOM (display:none) so CardElement never unmounts */}
          <Box sx={{ display: activeStep === 2 ? 'block' : 'none' }}>
            <Stack spacing={3}>
              <Typography variant="h5">Payment</Typography>

              {stripeReady ? (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CreditCard color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>Credit / Debit Card</Typography>
                    </Stack>
                    <Box sx={{
                      border: '1px solid',
                      borderColor: cardError ? 'error.main' : 'divider',
                      borderRadius: 2,
                      p: 2,
                      '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 1px rgba(196,149,106,0.3)' },
                    }}>
                      <CardElement
                        options={CARD_ELEMENT_OPTIONS}
                        onChange={(e) => {
                          setCardComplete(e.complete);
                          setCardError(e.error ? e.error.message : '');
                        }}
                      />
                    </Box>
                    {cardError && (
                      <Typography variant="caption" color="error">{cardError}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Your payment is processed securely by Stripe. We never store your card details.
                    </Typography>
                  </Stack>
                </Paper>
              ) : (
                <Alert severity="warning">
                  Online payment is not currently available. Please contact us to place your order.
                </Alert>
              )}

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Add a Tip</Typography>
                <ToggleButtonGroup
                  value={tip}
                  exclusive
                  onChange={(_, val) => val !== null && setTip(val)}
                  sx={{ gap: 1 }}
                >
                  {TIP_OPTIONS.map((t) => (
                    <ToggleButton
                      key={t}
                      value={t}
                      sx={{
                        borderRadius: '12px !important',
                        px: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' },
                      }}
                    >
                      {t === 0 ? 'No Tip' : `$${t}`}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  label="Promo Code" size="small" value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  sx={{ maxWidth: 300 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  sx={{ height: 40 }}
                >
                  {promoLoading ? 'Checking...' : 'Apply'}
                </Button>
              </Stack>
              {promoData && (
                <Alert severity="success">
                  Promo "{promoData.code}" applied — ${promoDiscount.toFixed(2)} off
                </Alert>
              )}
            </Stack>
          </Box>

          {/* Step 4: Review */}
          {activeStep === 3 && (
            <Stack spacing={3}>
              <Typography variant="h5">Review Your Order</Typography>

              <Box>
                {items.map((item) => (
                  <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="subtitle2">{item.product.name}</Typography>
                      {item.variant && <Typography variant="caption" color="text.secondary">{item.variant.name}</Typography>}
                      <Typography variant="caption" display="block" color="text.secondary">Qty: {item.quantity}</Typography>
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700}>${(item.unitPrice * item.quantity).toFixed(2)}</Typography>
                  </Stack>
                ))}
              </Box>

              <Divider />

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Subtotal</Typography>
                  <Typography fontWeight={600}>${subtotal.toFixed(2)}</Typography>
                </Stack>
                {promoDiscount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="success.main">Discount ({promoData?.code})</Typography>
                    <Typography fontWeight={600} color="success.main">-${promoDiscount.toFixed(2)}</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Tax (8.25%)</Typography>
                  <Typography fontWeight={600}>${taxAmount.toFixed(2)}</Typography>
                </Stack>
                {deliveryFee > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Delivery Fee</Typography>
                    <Typography fontWeight={600}>${deliveryFee.toFixed(2)}</Typography>
                  </Stack>
                )}
                {tip > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Tip</Typography>
                    <Typography fontWeight={600}>${tip.toFixed(2)}</Typography>
                  </Stack>
                )}
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={700}>${total.toFixed(2)}</Typography>
                </Stack>
              </Stack>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {fulfillment === 'PICKUP' ? 'Pickup' : 'Delivery'}
                </Typography>
                {fulfillment === 'DELIVERY' && (
                  <Typography variant="body2" color="text.secondary">
                    {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip}
                  </Typography>
                )}
                {selectedSlot && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedSlot.date || selectedSlot.label} — {selectedSlot.startTime} to {selectedSlot.endTime}
                  </Typography>
                )}
              </Paper>

              <TextField
                label="Order Notes (optional)"
                multiline rows={2} fullWidth value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Stack>
          )}

          {/* Navigation */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBack />}
              sx={{ borderRadius: 2 }}
            >
              Back
            </Button>
            {activeStep < STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNext} endIcon={<ArrowForward />} sx={{ borderRadius: 2 }}>
                Continue
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={handlePlaceOrder}
                disabled={submitting || (stripeReady && !cardComplete)}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                sx={{ borderRadius: 2, px: 4 }}
              >
                {submitting ? 'Processing Payment…' : `Pay $${total.toFixed(2)}`}
              </Button>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

/* ─── Wrapper that loads Stripe and provides Elements context ─── */
const CheckoutPage = () => {
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get('/settings/stripe-config');
        const pk = data.data?.publishableKey;
        if (pk) {
          setStripePromise(loadStripe(pk));
          setStripeReady(true);
        }
      } catch {
        // Stripe not configured
      } finally {
        setStripeLoading(false);
      }
    };
    init();
  }, []);

  // Show loading while Stripe is being fetched
  if (stripeLoading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">Loading checkout...</Typography>
        </Stack>
      </Box>
    );
  }

  // Stripe loaded — wrap in Elements
  if (stripeReady && stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <CheckoutForm stripeReady />
      </Elements>
    );
  }

  // Stripe not available — show error, don't render checkout without payment
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Online payment is currently unavailable. Please contact us to place your order.
        </Alert>
        <Button component={Link} to="/shop" variant="contained">Back to Shop</Button>
      </Container>
    </Box>
  );
};

export default CheckoutPage;
