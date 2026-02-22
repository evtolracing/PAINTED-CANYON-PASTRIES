import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Switch, FormControl, InputLabel, Select, MenuItem, Skeleton,
  FormControlLabel, Divider
} from '@mui/material';
import {
  Add, Edit, Delete, Refresh, MenuBook, Visibility, Article,
  QuestionAnswer, Description
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const AdminKnowledgeBase = () => {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0); // 0: Articles, 1: FAQ, 2: SOPs
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);

  // Article form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', slug: '', categoryId: '', content: '', excerpt: '',
    isPublished: false, isFaq: false, isInternal: false, sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditing, setCatEditing] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', slug: '', isPublic: true, sortOrder: 0 });

  const [deleteDialog, setDeleteDialog] = useState({ open: false, article: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [articlesRes, catsRes] = await Promise.all([
        api.get('/kb/admin/articles', { params: { limit: 100 } }).catch(() => api.get('/kb', { params: { limit: 100 } })),
        api.get('/kb/categories'),
      ]);
      setArticles(articlesRes.data.data || []);
      setCategories(catsRes.data.data || []);
    } catch (err) {
      showSnackbar('Failed to load knowledge base', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredArticles = articles.filter(a => {
    if (tab === 1) return a.isFaq;
    if (tab === 2) return a.isInternal;
    return !a.isInternal;
  });

  const handleOpen = (article = null) => {
    if (article) {
      setEditing(article);
      setForm({
        title: article.title, slug: article.slug || '',
        categoryId: article.categoryId || article.category?.id || '',
        content: article.content || '', excerpt: article.excerpt || '',
        isPublished: article.isPublished || false, isFaq: article.isFaq || false,
        isInternal: article.isInternal || false, sortOrder: article.sortOrder || 0,
      });
    } else {
      setEditing(null);
      setForm({
        title: '', slug: '', categoryId: categories[0]?.id || '', content: '', excerpt: '',
        isPublished: false, isFaq: tab === 1, isInternal: tab === 2, sortOrder: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.categoryId) {
      showSnackbar('Title and category are required', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (editing) {
        await api.put(`/kb/admin/articles/${editing.id}`, payload);
        showSnackbar('Article updated', 'success');
      } else {
        await api.post('/kb/admin/articles', payload);
        showSnackbar('Article created', 'success');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save article', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.article) return;
    try {
      await api.delete(`/kb/admin/articles/${deleteDialog.article.id}`);
      showSnackbar('Article deleted', 'success');
      setDeleteDialog({ open: false, article: null });
      fetchData();
    } catch (err) {
      showSnackbar('Failed to delete article', 'error');
    }
  };

  const handleCategoryOpen = (cat = null) => {
    if (cat) {
      setCatEditing(cat);
      setCatForm({ name: cat.name, slug: cat.slug, isPublic: cat.isPublic ?? true, sortOrder: cat.sortOrder || 0 });
    } else {
      setCatEditing(null);
      setCatForm({ name: '', slug: '', isPublic: true, sortOrder: categories.length });
    }
    setCatDialogOpen(true);
  };

  const handleCategorySave = async () => {
    if (!catForm.name) { showSnackbar('Name is required', 'error'); return; }
    try {
      const payload = {
        ...catForm,
        slug: catForm.slug || catForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      };
      if (catEditing) {
        await api.put(`/kb/categories/${catEditing.id}`, payload);
      } else {
        await api.post('/kb/categories', payload);
      }
      showSnackbar('Category saved', 'success');
      setCatDialogOpen(false);
      fetchData();
    } catch (err) {
      showSnackbar('Failed to save category', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Knowledge Base</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>New Article</Button>
          <IconButton onClick={fetchData}><Refresh /></IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Articles" icon={<Article />} iconPosition="start" />
              <Tab label="FAQ" icon={<QuestionAnswer />} iconPosition="start" />
              <Tab label="SOPs" icon={<Description />} iconPosition="start" />
            </Tabs>
          </Paper>

          {loading ? (
            <Paper sx={{ p: 2 }}>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
            </Paper>
          ) : filteredArticles.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <MenuBook sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                No {tab === 1 ? 'FAQ entries' : tab === 2 ? 'SOPs' : 'articles'} found
              </Typography>
              <Button variant="contained" sx={{ mt: 2 }} startIcon={<Add />} onClick={() => handleOpen()}>
                Create One
              </Button>
            </Paper>
          ) : (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Views</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredArticles.map(article => (
                      <TableRow key={article.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {article.title}
                          {article.isFaq && <Chip label="FAQ" size="small" sx={{ ml: 1, fontSize: '0.6rem', height: 18 }} />}
                          {article.isInternal && <Chip label="Internal" size="small" color="warning" sx={{ ml: 1, fontSize: '0.6rem', height: 18 }} />}
                        </TableCell>
                        <TableCell>{article.category?.name || '—'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={article.isPublished ? 'Published' : 'Draft'}
                            size="small"
                            color={article.isPublished ? 'success' : 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">{article.viewCount || 0}</TableCell>
                        <TableCell>{new Date(article.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpen(article)}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, article })}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>

        {/* Sidebar — Categories */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Categories</Typography>
              <IconButton size="small" onClick={() => handleCategoryOpen()}><Add fontSize="small" /></IconButton>
            </Box>
            {categories.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No categories yet</Typography>
            ) : (
              categories.map(cat => (
                <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{cat.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cat._count?.articles || 0} articles
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleCategoryOpen(cat)}><Edit fontSize="small" /></IconButton>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Article Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Article' : 'New Article'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Slug" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} helperText="Auto-generated" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={form.categoryId} label="Category"
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                  {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Sort Order" type="number" value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Excerpt" value={form.excerpt}
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Content" value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                multiline rows={10} placeholder="Markdown or HTML content..." />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />}
                  label="Published"
                />
                <FormControlLabel
                  control={<Switch checked={form.isFaq} onChange={e => setForm(f => ({ ...f, isFaq: e.target.checked }))} />}
                  label="FAQ"
                />
                <FormControlLabel
                  control={<Switch checked={form.isInternal} onChange={e => setForm(f => ({ ...f, isInternal: e.target.checked }))} />}
                  label="Internal (SOP)"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{catEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={catForm.name}
            onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} sx={{ mt: 2, mb: 2 }} />
          <TextField fullWidth label="Slug" value={catForm.slug}
            onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} sx={{ mb: 2 }} />
          <FormControlLabel
            control={<Switch checked={catForm.isPublic} onChange={e => setCatForm(f => ({ ...f, isPublic: e.target.checked }))} />}
            label="Public"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCategorySave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, article: null })}>
        <DialogTitle>Delete Article</DialogTitle>
        <DialogContent>
          <Typography>Delete "{deleteDialog.article?.title}"? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, article: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminKnowledgeBase;
