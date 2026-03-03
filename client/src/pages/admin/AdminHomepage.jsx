import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Paper, Button, Grid, Card, CardMedia,
  CardContent, Checkbox, Chip, TextField, InputAdornment, Skeleton,
  Alert, Tabs, Tab, Stack, Divider, IconButton
} from '@mui/material';
import {
  Search, Star, Spa, Save, Refresh, DragIndicator
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { getImageUrl } from '../../utils/imageUrl';

const AdminHomepage = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);

  // Selected product IDs
  const [bestSellers, setBestSellers] = useState([]);
  const [seasonal, setSeasonal] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, settingsRes] = await Promise.all([
        api.get('/products', { params: { limit: 200, sortBy: 'name', sortDir: 'asc' } }),
        api.get('/settings'),
      ]);
      setProducts(prodRes.data.data || []);

      const settings = settingsRes.data.data || {};
      if (settings['homepage.bestSellers']) {
        setBestSellers(settings['homepage.bestSellers']);
      }
      if (settings['homepage.seasonal']) {
        setSeasonal(settings['homepage.seasonal']);
      }
    } catch (err) {
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        'homepage.bestSellers': bestSellers,
        'homepage.seasonal': seasonal,
      });
      showSnackbar('Homepage collections saved!', 'success');
    } catch (err) {
      showSnackbar('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (productId, list, setList) => {
    setList(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeProducts = filteredProducts.filter(p => p.isActive);

  const currentList = tab === 0 ? bestSellers : seasonal;
  const currentSetter = tab === 0 ? setBestSellers : setSeasonal;
  const currentLabel = tab === 0 ? 'Best Sellers' : 'Seasonal Collection';

  const selectedProducts = products.filter(p => currentList.includes(p.id));

  const getProductImage = (product) => {
    const url = product.images?.[0]?.url || product.imageUrl;
    return url ? getImageUrl(url) : null;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Homepage Collections</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose which products appear in Best Sellers and Seasonal Collection on the public homepage.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={fetchData} variant="outlined" size="small">
            Refresh
          </Button>
          <Button
            startIcon={<Save />}
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            size="large"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab
          icon={<Star sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`Best Sellers (${bestSellers.length})`}
        />
        <Tab
          icon={<Spa sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`Seasonal Collection (${seasonal.length})`}
        />
      </Tabs>

      {/* Currently Selected */}
      {selectedProducts.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: tab === 0 ? 'rgba(196,149,106,0.08)' : 'rgba(139,195,74,0.08)', borderRadius: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
            Currently in {currentLabel} ({selectedProducts.length} items):
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedProducts.map(p => (
              <Chip
                key={p.id}
                label={p.name}
                onDelete={() => toggleProduct(p.id, currentList, currentSetter)}
                avatar={
                  getProductImage(p) ? (
                    <Box
                      component="img"
                      src={getProductImage(p)}
                      sx={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : undefined
                }
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {selectedProducts.length === 0 && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          No products selected for {currentLabel} yet. Check the products below to add them.
        </Alert>
      )}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Product Grid */}
      <Grid container spacing={2}>
        {activeProducts.map(product => {
          const isSelected = currentList.includes(product.id);
          const imgUrl = getProductImage(product);

          return (
            <Grid item xs={6} sm={4} md={3} lg={2.4} key={product.id}>
              <Card
                onClick={() => toggleProduct(product.id, currentList, currentSetter)}
                sx={{
                  cursor: 'pointer',
                  position: 'relative',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'transparent',
                  bgcolor: isSelected ? 'rgba(196,149,106,0.06)' : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: isSelected ? 'primary.dark' : 'divider',
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
              >
                <Checkbox
                  checked={isSelected}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    zIndex: 2,
                    bgcolor: 'rgba(255,255,255,0.85)',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleProduct(product.id, currentList, currentSetter)}
                />
                <CardMedia
                  sx={{
                    height: 140,
                    bgcolor: 'sandstone.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {imgUrl ? (
                    <Box
                      component="img"
                      src={imgUrl}
                      alt={product.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography variant="h3" sx={{ color: 'sandstone.300' }}>🥐</Typography>
                  )}
                </CardMedia>
                <CardContent sx={{ py: 1.5, px: 1.5 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                    {product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {product.category?.name}
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, mt: 0.5 }}>
                    ${Number(product.basePrice).toFixed(2)}
                  </Typography>
                  {product.badges?.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      {product.badges.map(b => (
                        <Chip key={b} label={b} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {activeProducts.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">
            {search ? 'No products match your search.' : 'No active products found.'}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default AdminHomepage;
