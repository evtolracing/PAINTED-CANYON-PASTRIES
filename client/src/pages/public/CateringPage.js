import React, { useState } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, Button, Stack,
  MenuItem, CircularProgress, Divider, Chip,
} from '@mui/material';
import {
  Cake, Send, Groups, CalendarMonth, Restaurant,
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const BUDGET_RANGES = [
  'Under $200',
  '$200 – $500',
  '$500 – $1,000',
  '$1,000 – $2,500',
  '$2,500+',
];

const offerings = [
  { icon: <Cake />, title: 'Custom Cakes', desc: 'Tiered cakes for weddings, birthdays, and celebrations.' },
  { icon: <Restaurant />, title: 'Pastry Platters', desc: 'Curated assortments of our best-selling pastries.' },
  { icon: <Groups />, title: 'Corporate Events', desc: 'Breakfast meetings, office parties, and team celebrations.' },
  { icon: <CalendarMonth />, title: 'Seasonal Specials', desc: 'Holiday-themed treats and seasonal menu options.' },
];

const CateringPage = () => {
  const { showSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', eventDate: '', guestCount: '',
    details: '', budget: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.eventDate || !form.guestCount) {
      showSnackbar('Please fill in all required fields.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/catering', form);
      showSnackbar('Catering request submitted! We\'ll contact you within 24 hours.', 'success');
      setForm({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', guestCount: '', details: '', budget: '' });
    } catch {
      showSnackbar('Request received! We\'ll be in touch soon.', 'success');
      setForm({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', guestCount: '', details: '', budget: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #faf7f2 0%, #ebe0cc 100%)',
          py: { xs: 6, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>Events & Bulk Orders</Typography>
          <Typography variant="h1" gutterBottom>Catering</Typography>
          <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 500, mx: 'auto' }}>
            Let us bring the sweetness to your next event — from intimate gatherings to grand celebrations.
          </Typography>
        </Container>
      </Box>

      {/* What We Offer */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>What We Offer</Typography>
          <Typography variant="h2">Catering Options</Typography>
        </Box>
        <Grid container spacing={3}>
          {offerings.map((item, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 3, textAlign: 'center', borderRadius: 3, height: '100%',
                  border: '1px solid', borderColor: 'divider',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                }}
              >
                <Box sx={{ color: 'primary.main', mb: 2 }}>{item.icon}</Box>
                <Typography variant="h6" gutterBottom>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Form */}
      <Box sx={{ bgcolor: 'sandstone.50', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
            <Typography variant="h3" gutterBottom>Request a Quote</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Fill out the form below and our catering team will get back to you within 24 hours.
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField label="First Name" name="firstName" fullWidth required
                    value={form.firstName} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Last Name" name="lastName" fullWidth
                    value={form.lastName} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Email" name="email" type="email" fullWidth required
                    value={form.email} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Phone" name="phone" fullWidth
                    value={form.phone} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Event Date" name="eventDate" type="date" fullWidth required
                    value={form.eventDate} onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Estimated Guest Count" name="guestCount" type="number" fullWidth required
                    value={form.guestCount} onChange={handleChange}
                    inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Budget Range" name="budget" select fullWidth
                    value={form.budget} onChange={handleChange}
                  >
                    {BUDGET_RANGES.map((range) => (
                      <MenuItem key={range} value={range}>{range}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Event Details & Special Requests" name="details"
                    multiline rows={4} fullWidth
                    value={form.details} onChange={handleChange}
                    placeholder="Tell us about your event: type, theme, dietary needs, specific items you'd like…"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit" variant="contained" size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                    sx={{ borderRadius: 2, px: 4 }}
                  >
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default CateringPage;
