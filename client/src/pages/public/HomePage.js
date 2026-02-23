import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Grid, Card, CardMedia, CardContent,
  CardActions, Chip, Stack, TextField, IconButton, Rating, Skeleton, Paper
} from '@mui/material';
import {
  ArrowForward, StorefrontOutlined, Schedule, Star,
  Email as EmailIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get('/products?featured=true&limit=8');
        setProducts(data.data || []);
      } catch {
        // Use placeholder data if API not ready
        setProducts(placeholderProducts);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    try {
      await api.post('/newsletter', { email });
      showSnackbar('Welcome to the Painted Canyon family! 🌵', 'success');
      setEmail('');
    } catch {
      showSnackbar('Thanks for subscribing!', 'success');
      setEmail('');
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: '70vh', md: '85vh' },
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #faf7f2 0%, #f5efe5 50%, #ebe0cc 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,149,106,0.1) 0%, transparent 70%)',
          }}
        />

        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="overline"
                sx={{ fontSize: '0.8rem', mb: 2, display: 'block', letterSpacing: '0.15em' }}
              >
                Joshua Tree, California
              </Typography>
              <Typography variant="h1" sx={{ mb: 3, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
                Artisan pastries crafted with
                <Box component="span" sx={{ color: 'primary.main', display: 'block' }}>
                  desert soul
                </Box>
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, maxWidth: 480, fontSize: '1.1rem', color: 'text.secondary' }}>
                Handmade cookies, croissants, cakes, and seasonal creations baked fresh daily.
                Order for pickup or local delivery.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  component={Link}
                  to="/shop"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
                >
                  Order Now
                </Button>
                <Button
                  component={Link}
                  to="/catering"
                  variant="outlined"
                  size="large"
                  sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
                >
                  Catering Menu
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                sx={{
                  width: '100%',
                  height: 500,
                  borderRadius: 4,
                  background: 'linear-gradient(160deg, #d4a87e 0%, #c4956a 30%, #a67c52 70%, #8b6544 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 60px rgba(139,101,68,0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.15,
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)',
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: '2.5rem',
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 600,
                    textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  🧁<br />Fresh Daily
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography variant="h2" align="center" sx={{ mb: 1 }}>
          How It Works
        </Typography>
        <Typography variant="body1" align="center" sx={{ color: 'text.secondary', mb: 6, maxWidth: 500, mx: 'auto' }}>
          Fresh-baked to order with convenient pickup and local delivery options.
        </Typography>
        <Grid container spacing={4}>
          {[
            { icon: <StorefrontOutlined sx={{ fontSize: 40 }} />, title: 'Browse & Order', desc: 'Explore our menu of handcrafted pastries, cookies, cakes, and seasonal specials.' },
            { icon: <Schedule sx={{ fontSize: 40 }} />, title: 'Choose Your Time', desc: 'Pick a convenient pickup window or delivery slot that works best for you.' },
            { icon: <LocalShipping sx={{ fontSize: 40 }} />, title: 'Pick Up or Deliver', desc: 'Grab your order from our Joshua Tree bakery, or we\'ll bring it to your door.' },
          ].map((step, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                }}
              >
                <Box sx={{ color: 'primary.main', mb: 2 }}>{step.icon}</Box>
                <Typography variant="h5" sx={{ mb: 1 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary">{step.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Best Sellers */}
      <Box sx={{ bgcolor: 'background.paper', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="overline">Customer Favorites</Typography>
              <Typography variant="h2">Best Sellers</Typography>
            </Box>
            <Button component={Link} to="/shop" endIcon={<ArrowForward />}>
              View All
            </Button>
          </Box>

          <Grid container spacing={3}>
            {(loading ? Array(4).fill(null) : products.slice(0, 4)).map((product, i) => (
              <Grid item xs={12} sm={6} md={3} key={product?.id || i}>
                {loading ? (
                  <Card>
                    <Skeleton variant="rectangular" height={220} />
                    <CardContent>
                      <Skeleton width="60%" />
                      <Skeleton width="80%" />
                      <Skeleton width="30%" />
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    component={Link}
                    to={`/product/${product.slug}`}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        sx={{
                          height: 220,
                          bgcolor: 'sandstone.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '3rem',
                        }}
                      >
                        🧁
                      </CardMedia>
                      {product.badges?.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 12, left: 12 }}>
                          {product.badges.map((badge) => (
                            <Chip
                              key={badge}
                              label={badge}
                              size="small"
                              color={badge === 'Best Seller' ? 'primary' : 'default'}
                              sx={{ fontWeight: 600, fontSize: '0.65rem' }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {product.category?.name}
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 0.5 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {product.shortDescription}
                      </Typography>
                      <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                        ${Number(product.basePrice).toFixed(2)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addItem(product);
                          showSnackbar(`${product.name} added to cart!`);
                        }}
                      >
                        Add to Cart
                      </Button>
                    </CardActions>
                  </Card>
                )}
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Seasonal / Featured */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                height: 400,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #ebe0cc 0%, #dccaaa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
              }}
            >
              🍂
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="overline">Limited Time</Typography>
            <Typography variant="h2" sx={{ mb: 2 }}>Seasonal Collection</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 420 }}>
              Discover our rotating selection of seasonal pastries inspired by the changing desert landscape. 
              From prickly pear tarts to Joshua Tree honey croissants — available while they last.
            </Typography>
            <Button
              component={Link}
              to="/shop/seasonal"
              variant="contained"
              endIcon={<ArrowForward />}
            >
              Shop Seasonal
            </Button>
          </Grid>
        </Grid>
      </Container>

      {/* Testimonials */}
      <Box sx={{ bgcolor: 'secondary.main', color: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h2" align="center" sx={{ color: 'white', mb: 6 }}>
            What Locals Say
          </Typography>
          <Grid container spacing={3}>
            {testimonials.map((t, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    height: '100%',
                  }}
                >
                  <Rating value={5} readOnly size="small" sx={{ mb: 2, '& .MuiRating-icon': { color: '#c4956a' } }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, fontStyle: 'italic' }}>
                    "{t.text}"
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: 'primary.light' }}>
                    — {t.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Gallery */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography variant="h2" align="center" sx={{ mb: 1 }}>From Our Bakery</Typography>
        <Typography variant="body1" align="center" sx={{ color: 'text.secondary', mb: 4 }}>
          @paintedcanyonpastries
        </Typography>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Box
                sx={{
                  aspectRatio: '1',
                  borderRadius: 3,
                  background: `linear-gradient(${135 + i * 30}deg, ${['#ebe0cc', '#dccaaa', '#c4956a', '#d4a87e', '#f5efe5', '#a67c52'][i]} 0%, ${['#dccaaa', '#c4956a', '#a67c52', '#c4956a', '#ebe0cc', '#8b6544'][i]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  transition: 'transform 0.3s',
                  '&:hover': { transform: 'scale(1.05)' },
                }}
              >
                {['🍪', '🥐', '🎂', '🧁', '🥧', '🍰'][i]}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Newsletter */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5efe5 0%, #ebe0cc 100%)',
          py: 8,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 1 }}>Stay in the Loop</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
              Be the first to know about new flavors, seasonal specials, and exclusive offers.
            </Typography>
            <Box component="form" onSubmit={handleNewsletter}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                <TextField
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="small"
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    flex: 1,
                    maxWidth: 320,
                  }}
                />
                <Button type="submit" variant="contained" startIcon={<EmailIcon />}>
                  Subscribe
                </Button>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

// Testimonials data
const testimonials = [
  { name: 'Sarah K., Yucca Valley', text: 'The chocolate croissants are the best I\'ve had outside of Paris. Fresh every morning and absolutely perfect.' },
  { name: 'Mike R., Joshua Tree', text: 'Ordered a birthday cake for my daughter — it was stunning AND delicious. The whole party was raving about it!' },
  { name: 'Jenny L., Twentynine Palms', text: 'Love the gluten-free options! Finally a bakery that makes GF cookies that actually taste amazing.' },
];

// Placeholder products for when API isn't available
const placeholderProducts = [
  { id: '1', name: 'Desert Sunset Cookie', slug: 'desert-sunset-cookie', shortDescription: 'Brown butter & sea salt', basePrice: '4.50', badges: ['Best Seller'], category: { name: 'Cookies' } },
  { id: '2', name: 'Classic Butter Croissant', slug: 'classic-butter-croissant', shortDescription: 'Layers of flaky perfection', basePrice: '5.50', badges: ['Best Seller'], category: { name: 'Croissants' } },
  { id: '3', name: 'Canyon Carrot Cake', slug: 'canyon-carrot-cake', shortDescription: 'Cream cheese frosting', basePrice: '42.00', badges: [], category: { name: 'Cakes' } },
  { id: '4', name: 'Prickly Pear Cupcake', slug: 'prickly-pear-cupcake', shortDescription: 'Seasonal desert flavor', basePrice: '5.00', badges: ['Seasonal'], category: { name: 'Cupcakes' } },
];

export default HomePage;
