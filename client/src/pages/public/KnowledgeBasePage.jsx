import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Chip, Skeleton, Stack,
  TextField, InputAdornment,
} from '@mui/material';
import { Search, MenuBook, ArrowForward } from '@mui/icons-material';
import api from '../../services/api';

const KnowledgeBasePage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data } = await api.get('/kb');
        setArticles(data.data || data || []);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Group by category
  const grouped = articles.reduce((acc, article) => {
    const cat = article.category?.name || article.categoryName || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(article);
    return acc;
  }, {});

  const filtered = search
    ? Object.entries(grouped).reduce((acc, [cat, arts]) => {
        const q = search.toLowerCase();
        const matching = arts.filter(
          (a) =>
            (a.title || '').toLowerCase().includes(q) ||
            (a.summary || a.content || '').toLowerCase().includes(q)
        );
        if (matching.length) acc[cat] = matching;
        return acc;
      }, {})
    : grouped;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #faf7f2 0%, #ebe0cc 100%)',
          py: { xs: 6, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <MenuBook sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h1" gutterBottom>Knowledge Base</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Helpful articles and guides about our products, ordering, and more.
          </Typography>
          <TextField
            placeholder="Search articles…"
            size="medium"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
            }}
            sx={{ maxWidth: 500, mx: 'auto', bgcolor: '#fff', borderRadius: 2 }}
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : Object.keys(filtered).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>No articles found</Typography>
            <Typography variant="body1" color="text.secondary">
              {search ? 'Try a different search term.' : 'No knowledge base articles are available yet.'}
            </Typography>
          </Box>
        ) : (
          Object.entries(filtered).map(([category, arts]) => (
            <Box key={category} sx={{ mb: 6 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <Typography variant="h4">{category}</Typography>
                <Chip label={`${arts.length} article${arts.length !== 1 ? 's' : ''}`} size="small" variant="outlined" />
              </Stack>
              <Grid container spacing={3}>
                {arts.map((article) => (
                  <Grid item xs={12} sm={6} md={4} key={article.id || article.slug}>
                    <Card
                      component={Link}
                      to={`/kb/${article.slug || article.id}`}
                      sx={{
                        textDecoration: 'none',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                      }}
                      elevation={1}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Chip
                          label={category}
                          size="small"
                          sx={{ mb: 1.5, bgcolor: 'rgba(196,149,106,0.12)', color: 'primary.dark', fontWeight: 600 }}
                        />
                        <Typography variant="h6" gutterBottom color="text.primary">
                          {article.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {(article.summary || article.content || '').slice(0, 120)}
                          {(article.summary || article.content || '').length > 120 ? '…' : ''}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'primary.main' }}>
                          <Typography variant="body2" fontWeight={600}>Read more</Typography>
                          <ArrowForward sx={{ fontSize: 16 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        )}
      </Container>
    </Box>
  );
};

export default KnowledgeBasePage;
