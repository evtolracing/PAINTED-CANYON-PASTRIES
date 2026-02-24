import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, TextField, Button, Stack, Divider,
  CircularProgress, InputAdornment, IconButton, Grid,
} from '@mui/material';
import {
  Person, Email, Lock, Phone, Visibility, VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password, confirmPassword, phone } = form;

    if (!firstName || !lastName || !email || !password) {
      showSnackbar('Please fill in all required fields.', 'error');
      return;
    }
    if (password.length < 8) {
      showSnackbar('Password must be at least 8 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showSnackbar('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await register({ firstName, lastName, email, password, phone });
      showSnackbar('Account created! Welcome to Painted Canyon Pastries.', 'success');
      navigate('/account');
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 5,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" gutterBottom>Create an Account</Typography>
          <Typography variant="body1" color="text.secondary">
            Join the Painted Canyon Pastries family for faster checkout and order tracking.
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="First Name" name="firstName" fullWidth required
                    value={form.firstName} onChange={handleChange}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Last Name" name="lastName" fullWidth required
                    value={form.lastName} onChange={handleChange}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Email Address" name="email" type="email" fullWidth required
                value={form.email} onChange={handleChange}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment> }}
              />

              <TextField
                label="Phone Number" name="phone" fullWidth
                value={form.phone} onChange={handleChange}
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                helperText="Optional — for order updates"
              />

              <TextField
                label="Password" name="password" type={showPassword ? 'text' : 'password'}
                fullWidth required value={form.password} onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="At least 8 characters"
              />

              <TextField
                label="Confirm Password" name="confirmPassword" type={showPassword ? 'text' : 'password'}
                fullWidth required value={form.confirmPassword} onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }}
              />

              <Button
                type="submit" variant="contained" size="large" fullWidth
                disabled={loading}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">OR</Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Typography
                component={Link} to="/login" variant="body2" color="primary.main"
                sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Sign in
              </Typography>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage;
