import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails,
  TextField, InputAdornment, Skeleton, Stack,
} from '@mui/material';
import { ExpandMore, Search, HelpOutline } from '@mui/icons-material';
import api from '../../services/api';

const FAQPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data } = await api.get('/kb?faq=true');
        setFaqs(data.data || data || []);
      } catch {
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      (faq) =>
        (faq.question || faq.title || '').toLowerCase().includes(q) ||
        (faq.answer || faq.content || '').toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const handleAccordionChange = (panel) => (_, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

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
          <HelpOutline sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h1" gutterBottom>Frequently Asked Questions</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Find answers to common questions about our products, ordering, and policies.
          </Typography>
          <TextField
            placeholder="Search FAQs…"
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

      {/* FAQ List */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
        {loading ? (
          <Stack spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={64} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>No results found</Typography>
            <Typography variant="body1" color="text.secondary">
              Try a different search term, or contact us for help.
            </Typography>
          </Box>
        ) : (
          filtered.map((faq, idx) => (
            <Accordion
              key={faq.id || idx}
              expanded={expanded === `faq-${idx}`}
              onChange={handleAccordionChange(`faq-${idx}`)}
              elevation={0}
              sx={{
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { borderColor: 'primary.main' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  px: 3,
                  '& .MuiAccordionSummary-content': { my: 2 },
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {faq.question || faq.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {faq.answer || faq.content}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Container>
    </Box>
  );
};

export default FAQPage;
