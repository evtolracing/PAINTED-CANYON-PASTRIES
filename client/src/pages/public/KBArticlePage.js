import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Breadcrumbs, Chip, Skeleton, Divider, Button,
} from '@mui/material';
import { NavigateNext, ArrowBack, CalendarToday } from '@mui/icons-material';
import api from '../../services/api';

const KBArticlePage = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/kb/articles/${slug}`);
        setArticle(data.data || data);
      } catch {
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Skeleton width={300} height={24} sx={{ mb: 3 }} />
        <Skeleton width="60%" height={48} sx={{ mb: 2 }} />
        <Skeleton width="30%" height={24} sx={{ mb: 4 }} />
        <Skeleton width="100%" height={20} />
        <Skeleton width="100%" height={20} />
        <Skeleton width="100%" height={20} />
        <Skeleton width="80%" height={20} />
      </Container>
    );
  }

  if (!article) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Article not found</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          The article you're looking for doesn't exist or has been removed.
        </Typography>
        <Button component={Link} to="/kb" startIcon={<ArrowBack />} variant="contained" sx={{ borderRadius: 2 }}>
          Back to Knowledge Base
        </Button>
      </Container>
    );
  }

  const updatedAt = article.updatedAt
    ? new Date(article.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
          <Typography component={Link} to="/" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
            Home
          </Typography>
          <Typography component={Link} to="/kb" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
            Knowledge Base
          </Typography>
          <Typography color="text.primary">{article.title}</Typography>
        </Breadcrumbs>

        <Paper elevation={2} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
          {/* Category */}
          {(article.category?.name || article.categoryName) && (
            <Chip
              label={article.category?.name || article.categoryName}
              size="small"
              sx={{ mb: 2, bgcolor: 'rgba(196,149,106,0.12)', color: 'primary.dark', fontWeight: 600 }}
            />
          )}

          {/* Title */}
          <Typography variant="h2" gutterBottom>{article.title}</Typography>

          {/* Meta */}
          {updatedAt && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3, color: 'text.secondary' }}>
              <CalendarToday sx={{ fontSize: 16 }} />
              <Typography variant="body2">Last updated: {updatedAt}</Typography>
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Content */}
          <Box sx={{
            '& p': { mb: 2, lineHeight: 1.8, color: 'text.secondary' },
            '& h2, & h3': { mt: 4, mb: 1.5, color: 'text.primary' },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& li': { mb: 0.5, lineHeight: 1.7, color: 'text.secondary' },
          }}>
            {article.content?.split('\n').map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return <Box key={idx} sx={{ height: 8 }} />;
              return (
                <Typography key={idx} variant="body1" color="text.secondary" paragraph>
                  {trimmed}
                </Typography>
              );
            })}
          </Box>
        </Paper>

        {/* Back Link */}
        <Button
          component={Link}
          to="/kb"
          startIcon={<ArrowBack />}
          sx={{ mt: 3, borderRadius: 2 }}
        >
          Back to Knowledge Base
        </Button>
      </Container>
    </Box>
  );
};

export default KBArticlePage;
