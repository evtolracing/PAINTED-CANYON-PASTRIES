import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardMedia, CardContent, Button,
  Breadcrumbs, Chip, Stack, Skeleton, IconButton, Divider, Paper,
  RadioGroup, Radio, FormControlLabel, FormControl, FormLabel, Checkbox,
  FormGroup, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Add, Remove, ShoppingCart, Warning, NavigateNext, ArrowBack,
} from '@mui/icons-material';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';

const ProductPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [related, setRelated] = useState([]);
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        const prod = data.data || data;
        setProduct(prod);
        if (prod.variants?.length) setSelectedVariant(prod.variants[0]);
        if (prod.categoryId || prod.category) {
          try {
            const catParam = prod.category?.slug || prod.categoryId;
            const { data: relData } = await api.get(`/products?category=${catParam}&limit=4`);
            const items = (relData.data || relData || []).filter((p) => p.id !== prod.id).slice(0, 4);
            setRelated(items);
          } catch { /* ignore */ }
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [slug]);

  const handleAddonToggle = (addon) => {
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const currentPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product?.basePrice || product?.price || 0);

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price || 0), 0);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selectedVariant, quantity, selectedAddons);
    showSnackbar(`${product.name} added to cart!`, 'success');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Skeleton width={300} height={24} sx={{ mb: 3 }} />
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton width="60%" height={40} />
            <Skeleton width="30%" height={36} sx={{ mt: 2 }} />
            <Skeleton width="100%" height={20} sx={{ mt: 2 }} />
            <Skeleton width="100%" height={20} />
            <Skeleton width="80%" height={20} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Product not found</Typography>
        <Button component={Link} to="/shop" startIcon={<ArrowBack />} variant="contained">
          Back to Shop
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
          <Typography component={Link} to="/" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
            Home
          </Typography>
          <Typography component={Link} to="/shop" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
            Shop
          </Typography>
          {product.category && (
            <Typography component={Link} to={`/shop/${product.category.slug || ''}`} color="inherit"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
              {product.category.name}
            </Typography>
          )}
          <Typography color="text.primary">{product.name}</Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Image */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: 'sandstone.100',
                height: { xs: 300, md: 450 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {(product.images?.[0]?.url || product.imageUrl) ? (
                <Box component="img" src={product.images?.[0]?.url || product.imageUrl} alt={product.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Typography variant="h1" sx={{ fontSize: '6rem', color: 'sandstone.300' }}>🎂</Typography>
              )}
            </Paper>
          </Grid>

          {/* Details */}
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Typography variant="h3">{product.name}</Typography>

              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                ${(currentPrice + addonsTotal).toFixed(2)}
                {quantity > 1 && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (${((currentPrice + addonsTotal) * quantity).toFixed(2)} total)
                  </Typography>
                )}
              </Typography>

              <Typography variant="body1" color="text.secondary">
                {product.description}
              </Typography>

              {/* Variants */}
              {product.variants?.length > 0 && (
                <FormControl component="fieldset">
                  <FormLabel sx={{ fontWeight: 600, mb: 1 }}>Size / Option</FormLabel>
                  <ToggleButtonGroup
                    value={selectedVariant?.id || ''}
                    exclusive
                    onChange={(_, val) => {
                      const v = product.variants.find((v) => v.id === val);
                      if (v) setSelectedVariant(v);
                    }}
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {product.variants.map((v) => (
                      <ToggleButton
                        key={v.id}
                        value={v.id}
                        sx={{
                          borderRadius: '12px !important',
                          px: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' },
                        }}
                      >
                        {v.name} — ${Number(v.price).toFixed(2)}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </FormControl>
              )}

              {/* Add-ons */}
              {product.addons?.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Add-ons</Typography>
                  <FormGroup>
                    {product.addons.map((addon) => (
                      <FormControlLabel
                        key={addon.id}
                        control={
                          <Checkbox
                            checked={selectedAddons.some((a) => a.id === addon.id)}
                            onChange={() => handleAddonToggle(addon)}
                            sx={{ color: 'primary.main' }}
                          />
                        }
                        label={`${addon.name} (+$${Number(addon.price).toFixed(2)})`}
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}

              {/* Allergens */}
              {product.allergens?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Allergens</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {product.allergens.map((allergen, idx) => (
                      <Chip
                        key={idx}
                        icon={<Warning sx={{ fontSize: 16 }} />}
                        label={typeof allergen === 'string' ? allergen : allergen.name}
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ borderRadius: 2 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Nutrition */}
              {product.nutritionNotes && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Nutrition Notes</Typography>
                  <Typography variant="body2" color="text.secondary">{product.nutritionNotes}</Typography>
                </Box>
              )}

              <Divider />

              {/* Quantity & Add to Cart */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Paper
                  variant="outlined"
                  sx={{ display: 'flex', alignItems: 'center', borderRadius: 2, overflow: 'hidden' }}
                >
                  <IconButton onClick={() => setQuantity((q) => Math.max(1, q - 1))} size="small">
                    <Remove />
                  </IconButton>
                  <Typography sx={{ px: 2, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>
                    {quantity}
                  </Typography>
                  <IconButton onClick={() => setQuantity((q) => q + 1)} size="small">
                    <Add />
                  </IconButton>
                </Paper>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ShoppingCart />}
                  onClick={handleAddToCart}
                  sx={{ flex: 1, borderRadius: 2, py: 1.5 }}
                >
                  Add to Cart — ${((currentPrice + addonsTotal) * quantity).toFixed(2)}
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        {/* Pairs Well With */}
        {related.length > 0 && (
          <Box sx={{ mt: 8 }}>
            <Typography variant="h4" gutterBottom>Pairs Well With</Typography>
            <Grid container spacing={3}>
              {related.map((p) => (
                <Grid item xs={6} sm={3} key={p.id}>
                  <Card
                    component={Link}
                    to={`/product/${p.slug || p.id}`}
                    sx={{
                      textDecoration: 'none',
                      borderRadius: 3,
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                    }}
                    elevation={1}
                  >
                    <CardMedia
                      sx={{ height: 140, bgcolor: 'sandstone.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {(p.images?.[0]?.url || p.imageUrl) ? (
                        <Box component="img" src={p.images?.[0]?.url || p.imageUrl} alt={p.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Typography sx={{ fontSize: '2.5rem', color: 'sandstone.300' }}>🥐</Typography>
                      )}
                    </CardMedia>
                    <CardContent>
                      <Typography variant="subtitle2" noWrap>{p.name}</Typography>
                      <Typography variant="body2" color="primary.main" fontWeight={700}>
                        ${Number(p.basePrice || p.price || 0).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ProductPage;
