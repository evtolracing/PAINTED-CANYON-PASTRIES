import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment, Skeleton, Avatar, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Add, Search, Edit, Delete, MoreVert, Restaurant, AutoAwesome,
  Visibility, VisibilityOff
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { getImageUrl } from '../../utils/imageUrl';

const AdminRecipes = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      const { data } = await api.get('/recipes', { params });
      setRecipes(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load recipes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchRecipes(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleMenuOpen = (e, recipe) => {
    setMenuAnchor(e.currentTarget);
    setSelectedRecipe(recipe);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleTogglePublish = async () => {
    handleMenuClose();
    if (!selectedRecipe) return;
    try {
      await api.put(`/recipes/${selectedRecipe.id}`, {
        isPublished: !selectedRecipe.isPublished,
      });
      showSnackbar(selectedRecipe.isPublished ? 'Recipe unpublished' : 'Recipe published', 'success');
      fetchRecipes();
    } catch {
      showSnackbar('Failed to update recipe', 'error');
    }
  };

  const handleDelete = async () => {
    setDeleteDialog(false);
    handleMenuClose();
    if (!selectedRecipe) return;
    try {
      await api.delete(`/recipes/${selectedRecipe.id}`);
      showSnackbar('Recipe deleted', 'success');
      fetchRecipes();
    } catch {
      showSnackbar('Failed to delete recipe', 'error');
    }
  };

  const getDifficultyColor = (d) => {
    if (d === 'Easy') return 'success';
    if (d === 'Medium') return 'warning';
    if (d === 'Advanced') return 'error';
    return 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700 }}>
            Recipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage bakery recipes with AI-powered creation
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={() => navigate('/admin/recipes/new?ai=true')}
          >
            AI Generate
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/admin/recipes/new')}
          >
            New Recipe
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><Search /></InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Recipe</TableCell>
              <TableCell>Difficulty</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Yield</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : recipes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Restaurant sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No recipes yet. Create your first recipe!</Typography>
                </TableCell>
              </TableRow>
            ) : (
              recipes.map((recipe) => (
                <TableRow
                  key={recipe.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/recipes/${recipe.id}/edit`)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={getImageUrl(recipe.imageUrl)}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}
                      >
                        <Restaurant fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{recipe.title}</Typography>
                        {recipe.isAIGenerated && (
                          <Chip label="AI" size="small" icon={<AutoAwesome />}
                            sx={{ height: 18, fontSize: '0.65rem', mt: 0.3 }} />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {recipe.difficulty && (
                      <Chip label={recipe.difficulty} size="small" color={getDifficultyColor(recipe.difficulty)} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {recipe.totalTime ? `${recipe.totalTime} min` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{recipe.yield || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={recipe.isPublished ? 'Published' : 'Draft'}
                      size="small"
                      color={recipe.isPublished ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(recipe.tags || []).slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, recipe)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/admin/recipes/${selectedRecipe?.id}/edit`); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleTogglePublish}>
          <ListItemIcon>{selectedRecipe?.isPublished ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</ListItemIcon>
          <ListItemText>{selectedRecipe?.isPublished ? 'Unpublish' : 'Publish'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setDeleteDialog(true); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirm */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Recipe</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{selectedRecipe?.title}"? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminRecipes;
