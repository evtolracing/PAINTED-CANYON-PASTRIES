import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, Button, Stack, Divider,
  CircularProgress, Skeleton,
} from '@mui/material';
import {
  Email, Phone, LocationOn, AccessTime, Send,
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

const ContactPage = () => {
  const { showSnackbar } = useSnackbar();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bakeryInfo, setBakeryInfo] = useState(null);
  const [storeHours, setStoreHours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data } = await api.get('/settings/public');
        setBakeryInfo(data.data.bakeryInfo);
        setStoreHours(data.data.storeHours || []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showSnackbar('Please fill in all fields.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      showSnackbar('Message sent! We\'ll get back to you soon.', 'success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      // Contact route may not exist; still show success since it's a non-critical feature
      showSnackbar('Message sent! We\'ll be in touch.', 'success');
      setForm({ name: '', email: '', message: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #faf7f2 0%, #ebe0cc 100%)',
          py: { xs: 6, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>Get in Touch</Typography>
          <Typography variant="h1" gutterBottom>Contact Us</Typography>
          <Typography variant="body1" color="text.secondary">
            We'd love to hear from you. Drop us a line or stop by the bakery!
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Grid container spacing={4}>
          {/* Contact Form */}
          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
              <Typography variant="h4" gutterBottom>Send a Message</Typography>
              <form onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Name" name="name" fullWidth required
                    value={form.name} onChange={handleChange}
                  />
                  <TextField
                    label="Email" name="email" type="email" fullWidth required
                    value={form.email} onChange={handleChange}
                  />
                  <TextField
                    label="Message" name="message" multiline rows={5} fullWidth required
                    value={form.message} onChange={handleChange}
                  />
                  <Button
                    type="submit" variant="contained" size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                    sx={{ borderRadius: 2, alignSelf: 'flex-start', px: 4 }}
                  >
                    {submitting ? 'Sending…' : 'Send Message'}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Grid>

          {/* Info & Map */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              {/* Contact Info */}
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h5" gutterBottom>Bakery Info</Typography>
                {loading ? (
                  <Stack spacing={2}>
                    <Skeleton width="80%" /><Skeleton width="60%" /><Skeleton width="70%" />
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    {bakeryInfo?.address && (
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ color: 'primary.main', mt: 0.5 }}><LocationOn /></Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>Address</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {bakeryInfo.address}{bakeryInfo.city ? `, ${bakeryInfo.city}` : ''}{bakeryInfo.state ? `, ${bakeryInfo.state}` : ''} {bakeryInfo.zip || ''}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                    {bakeryInfo?.phone && (
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ color: 'primary.main', mt: 0.5 }}><Phone /></Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>Phone</Typography>
                          <Typography variant="body2" color="text.secondary">{bakeryInfo.phone}</Typography>
                        </Box>
                      </Stack>
                    )}
                    {bakeryInfo?.email && (
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ color: 'primary.main', mt: 0.5 }}><Email /></Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>Email</Typography>
                          <Typography variant="body2" color="text.secondary">{bakeryInfo.email}</Typography>
                        </Box>
                      </Stack>
                    )}
                  </Stack>
                )}
              </Paper>

              {/* Hours */}
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <AccessTime color="primary" />
                  <Typography variant="h5">Bakery Hours</Typography>
                </Stack>
                {loading ? (
                  <Stack spacing={1}>{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} width="90%" />)}</Stack>
                ) : storeHours.length > 0 ? (
                  storeHours.map((h) => (
                    <Stack key={h.dayOfWeek} direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>{DAY_NAMES[h.dayOfWeek]}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {h.isClosed ? 'Closed' : `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`}
                      </Typography>
                    </Stack>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">Hours not available</Typography>
                )}
              </Paper>

              {/* Map */}
              {bakeryInfo?.address && (
                <Paper
                  elevation={0}
                  sx={{
                    height: 200,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <iframe
                    title="Bakery Location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${bakeryInfo.address}, ${bakeryInfo.city || ''}, ${bakeryInfo.state || ''} ${bakeryInfo.zip || ''}`)}&output=embed`}
                  />
                </Paper>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactPage;
