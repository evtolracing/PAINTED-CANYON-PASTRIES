import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Paper, Button, Stack, Divider, Avatar,
} from '@mui/material';
import {
  Favorite, EnergySavingsLeaf, Groups, Storefront, ArrowForward,
} from '@mui/icons-material';

const values = [
  {
    icon: <Favorite sx={{ fontSize: 36 }} />,
    title: 'Made with Love',
    description: 'Every pastry is handcrafted with care using recipes perfected over generations.',
  },
  {
    icon: <EnergySavingsLeaf sx={{ fontSize: 36 }} />,
    title: 'Locally Sourced',
    description: 'We partner with local farms and producers to bring you the freshest, most sustainable ingredients.',
  },
  {
    icon: <Groups sx={{ fontSize: 36 }} />,
    title: 'Community First',
    description: 'We believe in giving back. A portion of every sale supports local food banks and community programs.',
  },
  {
    icon: <Storefront sx={{ fontSize: 36 }} />,
    title: 'Small-Batch Quality',
    description: 'We bake in small batches daily to ensure every item is fresh, flavorful, and made to perfection.',
  },
];

const team = [
  { name: 'Isabella Torres', role: 'Head Baker & Founder', initials: 'IT' },
  { name: 'Marcus Chen', role: 'Pastry Chef', initials: 'MC' },
  { name: 'Sofia Ramirez', role: 'Operations Manager', initials: 'SR' },
  { name: 'David Kim', role: 'Front of House', initials: 'DK' },
];

const AboutPage = () => {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #faf7f2 0%, #ebe0cc 100%)',
          py: { xs: 8, md: 14 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute', top: -60, right: -60, width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%)',
          }}
        />
        <Container maxWidth="md">
          <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>Our Story</Typography>
          <Typography variant="h1" gutterBottom>
            Painted Canyon Pastries
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontWeight: 400 }}>
            Where the warmth of the desert meets the art of baking.
          </Typography>
        </Container>
      </Box>

      {/* Story */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                height: 350,
                borderRadius: 4,
                bgcolor: 'sandstone.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontSize: '5rem' }}>🏜️</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>How It All Started</Typography>
            <Typography variant="h3" gutterBottom>Baked in the Heart of the Desert</Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Painted Canyon Pastries was born from a love of baking and the breathtaking beauty of the
              Southwest. Our founder, Isabella Torres, grew up in a family where the kitchen was the heart
              of the home — where flour dusted the countertops and the aroma of fresh bread filled every room.
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              After years of honing her craft in bakeries across the country, Isabella returned home with a
              vision: to create a bakery that celebrates the colors, flavors, and warmth of the painted
              desert. Every pastry we make is inspired by the landscape — from our signature sandstone
              cookies to our canyon-layered croissants.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Today, Painted Canyon Pastries is more than a bakery. It's a gathering place, a celebration
              of community, and a testament to the power of handmade goodness.
            </Typography>
          </Grid>
        </Grid>
      </Container>

      {/* Values */}
      <Box sx={{ bgcolor: 'sandstone.50', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>What We Stand For</Typography>
            <Typography variant="h2">Our Values</Typography>
          </Box>
          <Grid container spacing={4}>
            {values.map((val, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderRadius: 3,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                  }}
                >
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{val.icon}</Box>
                  <Typography variant="h6" gutterBottom>{val.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{val.description}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Team */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>The People Behind the Pastries</Typography>
          <Typography variant="h2">Meet Our Team</Typography>
        </Box>
        <Grid container spacing={4} justifyContent="center">
          {team.map((member, idx) => (
            <Grid item xs={6} sm={3} key={idx}>
              <Paper
                elevation={0}
                sx={{ p: 3, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Avatar
                  sx={{
                    width: 80, height: 80, mx: 'auto', mb: 2,
                    bgcolor: 'primary.main', fontSize: '1.5rem', fontWeight: 700,
                  }}
                >
                  {member.initials}
                </Avatar>
                <Typography variant="h6" gutterBottom>{member.name}</Typography>
                <Typography variant="body2" color="text.secondary">{member.role}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box sx={{ bgcolor: 'secondary.main', color: '#fff', py: { xs: 6, md: 8 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h3" sx={{ color: '#fff', mb: 2 }}>
            Ready to Taste the Canyon?
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 4 }}>
            Order online for pickup or delivery, or visit us at the bakery.
          </Typography>
          <Button
            component={Link} to="/shop"
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, px: 4 }}
          >
            Shop Now
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutPage;
