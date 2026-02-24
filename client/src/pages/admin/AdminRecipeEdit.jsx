import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Paper, TextField, Grid, Divider,
  FormControl, InputLabel, Select, MenuItem, Chip, Switch, FormControlLabel,
  IconButton, Avatar, CircularProgress, Alert, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import {
  Save, ArrowBack, AutoAwesome, CloudUpload, Restaurant,
  Delete, InsertDriveFile, Image as ImageIcon, PictureAsPdf
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { getImageUrl } from '../../utils/imageUrl';

const AdminRecipeEdit = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const isNew = !id;
  const showAI = searchParams.get('ai') === 'true';

  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(showAI);
  const [uploading, setUploading] = useState({ image: false, doc: false });
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    yield: '',
    prepTime: '',
    bakeTime: '',
    totalTime: '',
    temperature: '',
    difficulty: '',
    notes: '',
    imageUrl: '',
    documents: [],
    tags: [],
    isPublished: false,
    isAIGenerated: false,
  });

  useEffect(() => {
    if (!isNew) {
      fetchRecipe();
    }
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const { data } = await api.get(`/recipes/${id}`);
      const r = data.data;
      setForm({
        title: r.title || '',
        description: r.description || '',
        ingredients: r.ingredients || '',
        instructions: r.instructions || '',
        yield: r.yield || '',
        prepTime: r.prepTime || '',
        bakeTime: r.bakeTime || '',
        totalTime: r.totalTime || '',
        temperature: r.temperature || '',
        difficulty: r.difficulty || '',
        notes: r.notes || '',
        imageUrl: r.imageUrl || '',
        documents: r.documents || [],
        tags: r.tags || [],
        isPublished: r.isPublished || false,
        isAIGenerated: r.isAIGenerated || false,
      });
    } catch {
      showSnackbar('Failed to load recipe', 'error');
      navigate('/admin/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showSnackbar('Title is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        prepTime: form.prepTime ? parseInt(form.prepTime) : null,
        bakeTime: form.bakeTime ? parseInt(form.bakeTime) : null,
        totalTime: form.totalTime ? parseInt(form.totalTime) : null,
      };

      if (isNew) {
        const { data } = await api.post('/recipes', payload);
        showSnackbar('Recipe created', 'success');
        navigate(`/admin/recipes/${data.data.id}/edit`);
      } else {
        await api.put(`/recipes/${id}`, payload);
        showSnackbar('Recipe saved', 'success');
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save recipe', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      showSnackbar('Enter a prompt to generate a recipe', 'error');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.post('/recipes/generate', { prompt: aiPrompt });
      const recipe = data.data;

      setForm((prev) => ({
        ...prev,
        title: recipe.title || prev.title,
        description: recipe.description || prev.description,
        ingredients: recipe.ingredients || prev.ingredients,
        instructions: recipe.instructions || prev.instructions,
        yield: recipe.yield || prev.yield,
        prepTime: recipe.prepTime || prev.prepTime,
        bakeTime: recipe.bakeTime || prev.bakeTime,
        totalTime: recipe.totalTime || prev.totalTime,
        temperature: recipe.temperature || prev.temperature,
        difficulty: recipe.difficulty || prev.difficulty,
        notes: recipe.notes || prev.notes,
        tags: recipe.tags || prev.tags,
        isAIGenerated: true,
      }));

      showSnackbar('Recipe generated! Review and edit before saving.', 'success');
      setShowAIPanel(false);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'AI generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, image: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, imageUrl: data.data.url }));
      showSnackbar('Image uploaded', 'success');
    } catch {
      showSnackbar('Image upload failed', 'error');
    } finally {
      setUploading((prev) => ({ ...prev, image: false }));
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, doc: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newDoc = {
        url: data.data.url,
        name: data.data.originalName,
        type: data.data.mimetype,
        size: data.data.size,
      };
      setForm((prev) => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc],
      }));
      showSnackbar('Document uploaded', 'success');
    } catch {
      showSnackbar('Document upload failed', 'error');
    } finally {
      setUploading((prev) => ({ ...prev, doc: false }));
    }
  };

  const handleRemoveDoc = (index) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const getDocIcon = (type) => {
    if (type?.includes('pdf')) return <PictureAsPdf color="error" />;
    if (type?.includes('image')) return <ImageIcon color="primary" />;
    return <InsertDriveFile color="action" />;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/admin/recipes')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700 }}>
            {isNew ? 'New Recipe' : 'Edit Recipe'}
          </Typography>
          {form.isAIGenerated && (
            <Chip label="AI Generated" icon={<AutoAwesome />} size="small" color="secondary" />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            {showAIPanel ? 'Hide AI' : 'AI Assist'}
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </Button>
        </Box>
      </Box>

      {/* AI Generation Panel */}
      {showAIPanel && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="secondary" /> AI Recipe Generator
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe what you want and AI will generate a complete recipe. You can edit everything after.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder='e.g. "Lavender honey scones with a lemon glaze, makes 12" or "Gluten-free chocolate brownies for a desert-themed bakery"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="secondary"
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesome />}
            onClick={handleAIGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Recipe'}
          </Button>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Left Column — Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Basic Info</Typography>

            <TextField
              fullWidth label="Recipe Title" value={form.title}
              onChange={handleChange('title')} sx={{ mb: 2 }} required
            />
            <TextField
              fullWidth label="Description" value={form.description}
              onChange={handleChange('description')} multiline rows={2} sx={{ mb: 2 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth label="Prep (min)" type="number" value={form.prepTime}
                  onChange={handleChange('prepTime')} size="small" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth label="Bake (min)" type="number" value={form.bakeTime}
                  onChange={handleChange('bakeTime')} size="small" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth label="Total (min)" type="number" value={form.totalTime}
                  onChange={handleChange('totalTime')} size="small" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth label="Temperature" value={form.temperature}
                  onChange={handleChange('temperature')} size="small" placeholder="350°F" />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={6}>
                <TextField fullWidth label="Yield" value={form.yield}
                  onChange={handleChange('yield')} size="small" placeholder="24 cookies" />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Difficulty</InputLabel>
                  <Select value={form.difficulty} onChange={handleChange('difficulty')} label="Difficulty">
                    <MenuItem value="">—</MenuItem>
                    <MenuItem value="Easy">Easy</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Ingredients</Typography>
            <TextField
              fullWidth multiline rows={8} value={form.ingredients}
              onChange={handleChange('ingredients')}
              placeholder={'2 cups all-purpose flour\n1 cup sugar\n3 large eggs\n1 tsp vanilla extract\n...'}
            />
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Instructions</Typography>
            <TextField
              fullWidth multiline rows={10} value={form.instructions}
              onChange={handleChange('instructions')}
              placeholder={'1. Preheat oven to 350°F.\n2. Mix dry ingredients in a large bowl.\n3. In a separate bowl, whisk eggs and sugar.\n...'}
            />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Notes & Tips</Typography>
            <TextField
              fullWidth multiline rows={4} value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Storage tips, variations, scaling notes..."
            />
          </Paper>
        </Grid>

        {/* Right Column — Image, Documents, Tags, Settings */}
        <Grid item xs={12} md={4}>
          {/* Recipe Image */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Recipe Image</Typography>

            {form.imageUrl ? (
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Box
                  component="img"
                  src={getImageUrl(form.imageUrl)}
                  alt="Recipe"
                  sx={{ width: '100%', borderRadius: 2, maxHeight: 220, objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                  sx={{
                    position: 'absolute', top: 8, right: 8,
                    bgcolor: 'rgba(0,0,0,0.5)', color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Box
                onClick={() => imageInputRef.current?.click()}
                sx={{
                  border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                  p: 4, textAlign: 'center', cursor: 'pointer', mb: 2,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                {uploading.image ? (
                  <CircularProgress size={32} />
                ) : (
                  <>
                    <CloudUpload sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Click to upload recipe image
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      JPG, PNG, WEBP up to 10MB
                    </Typography>
                  </>
                )}
              </Box>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />

            {form.imageUrl && (
              <Button
                fullWidth variant="outlined" size="small"
                startIcon={<CloudUpload />}
                onClick={() => imageInputRef.current?.click()}
              >
                Replace Image
              </Button>
            )}
          </Paper>

          {/* Recipe Documents */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Documents</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Upload PDFs, images, or other recipe-related files
            </Typography>

            {(form.documents || []).length > 0 && (
              <List dense sx={{ mb: 2 }}>
                {form.documents.map((doc, index) => (
                  <ListItem key={index} sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getDocIcon(doc.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.name}
                      primaryTypographyProps={{ fontSize: '0.8rem', noWrap: true }}
                      secondary={doc.type?.split('/')[1]?.toUpperCase()}
                      secondaryTypographyProps={{ fontSize: '0.65rem' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => handleRemoveDoc(index)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            <Button
              fullWidth variant="outlined" size="small"
              startIcon={uploading.doc ? <CircularProgress size={16} /> : <CloudUpload />}
              onClick={() => docInputRef.current?.click()}
              disabled={uploading.doc}
            >
              {uploading.doc ? 'Uploading...' : 'Upload Document'}
            </Button>

            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              hidden
              onChange={handleDocUpload}
            />
          </Paper>

          {/* Tags */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Tags</Typography>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {form.tags.map((tag) => (
                <Chip
                  key={tag} label={tag} size="small"
                  onDelete={() => handleRemoveTag(tag)}
                />
              ))}
            </Box>

            <TextField
              fullWidth size="small" placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
              }}
              InputProps={{
                endAdornment: tagInput && (
                  <Button size="small" onClick={handleAddTag}>Add</Button>
                ),
              }}
            />
          </Paper>

          {/* Settings */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Settings</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublished}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
              }
              label="Published"
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminRecipeEdit;
