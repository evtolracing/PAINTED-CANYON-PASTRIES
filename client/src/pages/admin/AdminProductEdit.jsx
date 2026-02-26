import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Paper, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Chip, Switch, FormControlLabel, Divider,
  CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, OutlinedInput, ImageList, ImageListItem,
  ImageListItemBar
} from '@mui/material';
import { ArrowBack, Add, Delete, Save, Cancel, CloudUpload, Star, StarBorder } from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { getImageUrl } from '../../utils/imageUrl';

const BADGE_OPTIONS = ['Best Seller', 'New', 'Limited', 'Gluten-Free', 'Vegan', 'Seasonal', 'Staff Pick'];

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [allergens, setAllergens] = useState([]);

  const [form, setForm] = useState({
    name: '', slug: '', categoryId: '', shortDescription: '', description: '',
    basePrice: '', compareAtPrice: '', sku: '', badges: [],
    isFeatured: false, isActive: true,
    seasonalStart: '', seasonalEnd: '', nutritionNotes: '',
  });

  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const imageInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [catRes] = await Promise.all([
          api.get('/categories'),
        ]);
        setCategories(catRes.data.data || []);

        // Try to load allergens
        try {
          const allergenRes = await api.get('/products/allergens');
          setAllergens(allergenRes.data.data || []);
        } catch {
          setAllergens([
            { id: 'gluten', name: 'Gluten' }, { id: 'dairy', name: 'Dairy' },
            { id: 'nuts', name: 'Nuts' }, { id: 'eggs', name: 'Eggs' },
            { id: 'soy', name: 'Soy' }, { id: 'wheat', name: 'Wheat' },
          ]);
        }

        if (!isNew) {
          const { data } = await api.get(`/products/${id}`);
          const p = data.data;
          setForm({
            name: p.name || '', slug: p.slug || '', categoryId: p.categoryId || '',
            shortDescription: p.shortDescription || '', description: p.description || '',
            basePrice: p.basePrice || '', compareAtPrice: p.compareAtPrice || '', sku: p.sku || '',
            badges: p.badges || [], isFeatured: p.isFeatured || false, isActive: p.isActive ?? true,
            seasonalStart: p.seasonalStart ? p.seasonalStart.slice(0, 10) : '',
            seasonalEnd: p.seasonalEnd ? p.seasonalEnd.slice(0, 10) : '',
            nutritionNotes: p.nutritionNotes || '',
          });
          setVariants(p.variants || []);
          setAddons(p.addons || []);
          setSelectedAllergens((p.allergenTags || []).map(t => t.allergenId || t.allergen?.id));
          setProductImages(p.images || []);
        }
      } catch (err) {
        showSnackbar('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isNew]);

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      if (field === 'name' && (isNew || prev.slug === slugify(prev.name))) {
        updated.slug = slugify(val);
      }
      return updated;
    });
  };

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const addVariant = () => setVariants(v => [...v, { name: '', type: 'size', price: '', sku: '', isActive: true, isNew: true }]);
  const removeVariant = (idx) => setVariants(v => v.filter((_, i) => i !== idx));
  const updateVariant = (idx, field, val) => setVariants(v => v.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const addAddon = () => setAddons(a => [...a, { name: '', price: '', isActive: true, isNew: true }]);
  const removeAddon = (idx) => setAddons(a => a.filter((_, i) => i !== idx));
  const updateAddon = (idx, field, val) => setAddons(a => a.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // If new product, stage files for upload after save
    if (isNew) {
      const fileArray = Array.from(files).map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        name: f.name,
      }));
      setPendingFiles(prev => [...prev, ...fileArray]);
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    setUploadingImages(true);
    try {
      const { data } = await api.post(`/products/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProductImages(prev => [...prev, ...(data.data || [])]);
      showSnackbar('Images uploaded!', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to upload images', 'error');
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await api.put(`/products/${id}/images/${imageId}/primary`);
      setProductImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === imageId })));
      showSnackbar('Primary image updated', 'success');
    } catch {
      showSnackbar('Failed to set primary image', 'error');
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/products/${id}/images/${imageId}`);
      setProductImages(prev => prev.filter(img => img.id !== imageId));
      showSnackbar('Image deleted', 'success');
    } catch {
      showSnackbar('Failed to delete image', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.categoryId || !form.basePrice) {
      showSnackbar('Name, category, and price are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        basePrice: parseFloat(form.basePrice),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        seasonalStart: form.seasonalStart || null,
        seasonalEnd: form.seasonalEnd || null,
        variants: variants.map(v => ({
          ...(v.isNew ? {} : { id: v.id }),
          name: v.name, type: v.type, price: parseFloat(v.price) || 0,
          sku: v.sku || null, isActive: v.isActive,
        })),
        addons: addons.map(a => ({
          ...(a.isNew ? {} : { id: a.id }),
          name: a.name, price: parseFloat(a.price) || 0, isActive: a.isActive,
        })),
        allergenIds: selectedAllergens.map(id => ({ allergenId: id, severity: 'contains' })),
      };

      if (isNew) {
        const { data } = await api.post('/products', payload);
        const newProductId = data.data?.id;

        // Upload any staged images
        if (newProductId && pendingFiles.length > 0) {
          const imgFormData = new FormData();
          pendingFiles.forEach(pf => imgFormData.append('images', pf.file));
          try {
            await api.post(`/products/${newProductId}/images`, imgFormData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch {
            showSnackbar('Product created but some images failed to upload', 'warning');
          }
          // Clean up preview URLs
          pendingFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
          setPendingFiles([]);
        }

        showSnackbar('Product created!', 'success');
        navigate(`/admin/products/${newProductId}/edit`);
      } else {
        await api.put(`/products/${id}`, payload);
        showSnackbar('Product updated!', 'success');
        navigate('/admin/products');
      }
    } catch (err) {
      showSnackbar(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/products')}><ArrowBack /></IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main', flex: 1 }}>
          {isNew ? 'New Product' : 'Edit Product'}
        </Typography>
        <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/admin/products')}>Cancel</Button>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Main Form */}
        <Grid item xs={12} md={8}>
          {/* Basic Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Basic Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth label="Product Name" value={form.name} onChange={handleChange('name')} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Slug" value={form.slug} onChange={handleChange('slug')}
                  helperText="Auto-generated from name" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.categoryId} label="Category" onChange={handleChange('categoryId')}>
                    {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Base Price" type="number" value={form.basePrice}
                  onChange={handleChange('basePrice')} required inputProps={{ step: '0.01', min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Compare At Price" type="number" value={form.compareAtPrice}
                  onChange={handleChange('compareAtPrice')} inputProps={{ step: '0.01', min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="SKU" value={form.sku} onChange={handleChange('sku')} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Short Description" value={form.shortDescription}
                  onChange={handleChange('shortDescription')} multiline rows={2} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" value={form.description}
                  onChange={handleChange('description')} multiline rows={4} />
              </Grid>
            </Grid>
          </Paper>

          {/* Variants */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Variants</Typography>
              <Button size="small" startIcon={<Add />} onClick={addVariant}>Add Variant</Button>
            </Box>
            {variants.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No variants. Add size, pack, or flavor options.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variants.map((v, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField size="small" value={v.name} onChange={e => updateVariant(idx, 'name', e.target.value)} fullWidth />
                        </TableCell>
                        <TableCell>
                          <Select size="small" value={v.type} onChange={e => updateVariant(idx, 'type', e.target.value)}>
                            <MenuItem value="size">Size</MenuItem>
                            <MenuItem value="pack">Pack</MenuItem>
                            <MenuItem value="flavor">Flavor</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} sx={{ width: 100 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={v.sku || ''} onChange={e => updateVariant(idx, 'sku', e.target.value)} sx={{ width: 120 }} />
                        </TableCell>
                        <TableCell>
                          <Switch size="small" checked={v.isActive} onChange={e => updateVariant(idx, 'isActive', e.target.checked)} />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => removeVariant(idx)}><Delete fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Add-ons */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Add-ons</Typography>
              <Button size="small" startIcon={<Add />} onClick={addAddon}>Add Add-on</Button>
            </Box>
            {addons.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No add-ons. Add gift notes, candles, etc.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {addons.map((a, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField size="small" value={a.name} onChange={e => updateAddon(idx, 'name', e.target.value)} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={a.price} onChange={e => updateAddon(idx, 'price', e.target.value)} sx={{ width: 100 }} />
                        </TableCell>
                        <TableCell>
                          <Switch size="small" checked={a.isActive} onChange={e => updateAddon(idx, 'isActive', e.target.checked)} />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => removeAddon(idx)}><Delete fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Allergens */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Allergen Tags</Typography>
            <Grid container spacing={1}>
              {allergens.map(a => (
                <Grid item key={a.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedAllergens.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedAllergens(prev => [...prev, a.id]);
                          else setSelectedAllergens(prev => prev.filter(x => x !== a.id));
                        }}
                      />
                    }
                    label={a.name}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Image Upload Area */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Images</Typography>

            {/* Existing images */}
            {productImages.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ mb: 2 }}>
                {productImages.map((img) => (
                  <ImageListItem key={img.id} sx={{ borderRadius: 2, overflow: 'hidden', border: img.isPrimary ? '2px solid' : '1px solid', borderColor: img.isPrimary ? 'primary.main' : 'divider' }}>
                    <img src={getImageUrl(img.url)} alt={img.alt || 'Product'} loading="lazy" style={{ height: 120, objectFit: 'cover' }} />
                    <ImageListItemBar
                      sx={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
                      actionIcon={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" sx={{ color: 'white' }} onClick={() => handleSetPrimary(img.id)} title="Set as primary">
                            {img.isPrimary ? <Star sx={{ color: '#ffd700' }} /> : <StarBorder />}
                          </IconButton>
                          <IconButton size="small" sx={{ color: 'white' }} onClick={() => handleDeleteImage(img.id)} title="Delete">
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            )}

            {/* Pending images (new product, not yet saved) */}
            {pendingFiles.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ mb: 2 }}>
                {pendingFiles.map((pf, idx) => (
                  <ImageListItem key={idx} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px dashed', borderColor: 'primary.main' }}>
                    <img src={pf.preview} alt={pf.name} loading="lazy" style={{ height: 120, objectFit: 'cover' }} />
                    <ImageListItemBar
                      subtitle="Pending upload"
                      sx={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
                      actionIcon={
                        <IconButton size="small" sx={{ color: 'white' }} onClick={() => removePendingFile(idx)} title="Remove">
                          <Delete />
                        </IconButton>
                      }
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            )}

            {/* Upload area */}
            <Box
              onClick={() => imageInputRef.current?.click()}
              sx={{
                border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                p: 4, textAlign: 'center', cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(196,149,106,0.04)' },
              }}
            >
              {uploadingImages ? (
                <CircularProgress size={32} sx={{ color: 'primary.main' }} />
              ) : (
                <>
                  <CloudUpload sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {isNew ? 'Click to select images (will upload when saved)' : 'Click to upload images'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supports JPG, PNG, WebP up to 5MB
                  </Typography>
                </>
              )}
            </Box>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Status */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Status</Typography>
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={handleChange('isActive')} />}
              label={form.isActive ? 'Active' : 'Inactive'}
            />
            <FormControlLabel
              control={<Switch checked={form.isFeatured} onChange={handleChange('isFeatured')} />}
              label="Featured Product"
            />
          </Paper>

          {/* Badges */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Badges</Typography>
            <FormControl fullWidth>
              <InputLabel>Badges</InputLabel>
              <Select
                multiple value={form.badges}
                onChange={handleChange('badges')}
                input={<OutlinedInput label="Badges" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map(v => <Chip key={v} label={v} size="small" />)}
                  </Box>
                )}
              >
                {BADGE_OPTIONS.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
          </Paper>

          {/* Seasonal */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Seasonal Availability</Typography>
            <TextField
              fullWidth label="Start Date" type="date" value={form.seasonalStart}
              onChange={handleChange('seasonalStart')} InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
            />
            <TextField
              fullWidth label="End Date" type="date" value={form.seasonalEnd}
              onChange={handleChange('seasonalEnd')} InputLabelProps={{ shrink: true }}
            />
          </Paper>

          {/* Nutrition */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Nutrition Notes</Typography>
            <TextField
              fullWidth multiline rows={3} value={form.nutritionNotes}
              onChange={handleChange('nutritionNotes')} placeholder="Enter nutrition information..."
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminProductEdit;
