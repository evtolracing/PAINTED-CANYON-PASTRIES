import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardMedia, CardContent, CardActions,
  Button, TextField, Chip, Stack, Skeleton, InputAdornment, Tabs, Tab,
  Drawer, List, ListItemButton, ListItemText, IconButton, useMediaQuery,
  useTheme, Paper, Divider, Badge,
} from '@mui/material';
import {
  Search, FilterList, ShoppingCart, Star, LocalOffer, Close,
} from '@mui/icons-material';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';

const CATEGORIES = [
  { key: 'all', label: 'All Products' },
  { key: 'cookies', label: 'Cookies' },
  { key: 'croissants', label: 'Croissants' },
  { key: 'cakes', label: 'Cakes' },
  { key: 'cupcakes', label: 'Cupcakes' },
  { key: 'bars', label: 'Bars' },
  { key: 'gluten-free', label: 'Gluten-Free' },
  { key: 'seasonal', label: 'Seasonal' },
];

const getBadge = (product) => {
  if (product.isBestSeller) return { label: 'Best Seller', color: '#c4956a' };
  if (product.isLimited || product.isSeasonal) return { label: 'Limited', color: '#e65100' };
  if (product.isGlutenFree) return { label: 'GF', color: '#7c8b6f' };
  return null;
};

const ShopPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();

  const activeCategory = category || 'all';

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (activeCategory !== 'all') params.category = activeCategory;
        if (search) params.search = search;
        const { data } = await api.get('/products', { params });
        setProducts(data.data || data || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [activeCategory, search]);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleCategoryChange = (key) => {
    navigate(key === 'all' ? '/shop' : `/shop/${key}`);
    setDrawerOpen(false);
  };

  const handleAddToCart = (product) => {
    addItem(product, null, 1);
    showSnackbar(`${product.name} added to cart!`, 'success');
  };

  const categoryTabs = (
    <Tabs
      value={CATEGORIES.findIndex((c) => c.key === activeCategory)}
      onChange={(_, idx) => handleCategoryChange(CATEGORIES[idx].key)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minWidth: 100 } }}
    >
      {CATEGORIES.map((c) => (
        <Tab key={c.key} label={c.label} />
      ))}
    </Tabs>
  );

  const sidebar = (
    <List sx={{ minWidth: 200 }}>
      {CATEGORIES.map((c) => (
        <ListItemButton
          key={c.key}
          selected={activeCategory === c.key}
          onClick={() => handleCategoryChange(c.key)}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            '&.Mui-selected': { bgcolor: 'rgba(196,149,106,0.12)', color: 'primary.dark' },
          }}
        >
          <ListItemText primary={c.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h2" gutterBottom>Our Pastries</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
            Handcrafted daily with the finest ingredients, inspired by the beauty of the desert Southwest.
          </Typography>
        </Box>

        {/* Search & Filter Bar */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            placeholder="Search pastries…"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Search /></InputAdornment>
              ),
            }}
          />
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)}>
              <FilterList />
            </IconButton>
          )}
        </Stack>

        {/* Mobile Filter Drawer */}
        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 260, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Categories</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}><Close /></IconButton>
            </Stack>
            {sidebar}
          </Box>
        </Drawer>

        <Grid container spacing={3}>
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Grid item md={2.5}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 1, px: 1 }}>Categories</Typography>
                <Divider sx={{ mb: 1 }} />
                {sidebar}
              </Paper>
            </Grid>
          )}

          {/* Product Grid */}
          <Grid item xs={12} md={isMobile ? 12 : 9.5}>
            {isMobile && categoryTabs}

            {loading ? (
              <Grid container spacing={3}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                    <Card sx={{ borderRadius: 3 }}>
                      <Skeleton variant="rectangular" height={200} />
                      <CardContent>
                        <Skeleton width="70%" height={28} />
                        <Skeleton width="40%" height={24} sx={{ mt: 1 }} />
                        <Skeleton width="100%" height={16} sx={{ mt: 1 }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography variant="h5" color="text.secondary" gutterBottom>No pastries found</Typography>
                <Typography variant="body1" color="text.secondary">
                  Try a different search or category.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {filtered.map((product) => {
                  const badge = getBadge(product);
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                          position: 'relative',
                        }}
                        elevation={2}
                      >
                        {badge && (
                          <Chip
                            label={badge.label}
                            size="small"
                            sx={{
                              position: 'absolute', top: 12, left: 12, zIndex: 1,
                              bgcolor: badge.color, color: '#fff', fontWeight: 700,
                            }}
                          />
                        )}
                        <CardMedia
                          component={Link}
                          to={`/product/${product.slug || product.id}`}
                          sx={{
                            height: 200,
                            bgcolor: 'sandstone.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                          }}
                        >
                          {(product.images?.[0]?.url || product.imageUrl) ? (
                            <Box component="img" src={product.images?.[0]?.url || product.imageUrl} alt={product.name}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Typography variant="h3" sx={{ color: 'sandstone.300' }}>🥐</Typography>
                          )}
                        </CardMedia>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="h6"
                            component={Link}
                            to={`/product/${product.slug || product.id}`}
                            sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                          >
                            {product.name}
                          </Typography>
                          <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700, mt: 0.5 }}>
                            ${Number(product.basePrice || product.price || 0).toFixed(2)}
                          </Typography>
                          {product.shortDescription && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>
                              {product.shortDescription}
                            </Typography>
                          )}
                        </CardContent>
                        <CardActions sx={{ px: 2, pb: 2 }}>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            startIcon={<ShoppingCart />}
                            onClick={() => handleAddToCart(product)}
                            sx={{ borderRadius: 2 }}
                          >
                            Add to Cart
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ShopPage;
