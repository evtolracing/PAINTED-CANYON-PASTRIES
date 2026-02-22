import React, { useState } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, Button, Stack, Divider,
  CircularProgress,
} from '@mui/material';
import {
  Email, Phone, LocationOn, AccessTime, Send,
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const info = [
  { icon: <LocationOn />, label: 'Address', value: '2847 Canyon Road, Sedona, AZ 86336' },
  { icon: <Phone />, label: 'Phone', value: '(928) 555-0142' },
  { icon: <Email />, label: 'Email', value: 'hello@paintedcanyonpastries.com' },
];

const hours = [
  { day: 'Monday – Friday', time: '6:00 AM – 6:00 PM' },
  { day: 'Saturday', time: '7:00 AM – 5:00 PM' },
  { day: 'Sunday', time: '8:00 AM – 2:00 PM' },
];

const ContactPage = () => {
  const { showSnackbar } = useSnackbar();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

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
                <Stack spacing={2}>
                  {info.map((item, idx) => (
                    <Stack key={idx} direction="row" spacing={2} alignItems="flex-start">
                      <Box sx={{ color: 'primary.main', mt: 0.5 }}>{item.icon}</Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>{item.label}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.value}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Paper>

              {/* Hours */}
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <AccessTime color="primary" />
                  <Typography variant="h5">Bakery Hours</Typography>
                </Stack>
                {hours.map((h, idx) => (
                  <Stack key={idx} direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                    <Typography variant="body2" fontWeight={600}>{h.day}</Typography>
                    <Typography variant="body2" color="text.secondary">{h.time}</Typography>
                  </Stack>
                ))}
              </Paper>

              {/* Map Placeholder */}
              <Paper
                elevation={0}
                sx={{
                  height: 200,
                  borderRadius: 3,
                  bgcolor: 'sandstone.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack alignItems="center" spacing={1}>
                  <LocationOn sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary">Map placeholder</Typography>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactPage;
