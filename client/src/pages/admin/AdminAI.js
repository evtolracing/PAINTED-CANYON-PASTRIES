import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  IconButton, Skeleton, Divider, LinearProgress, Card, CardContent,
  Alert
} from '@mui/material';
import {
  Refresh, CloudUpload, SmartToy, Search, Description,
  Send, Psychology, DataObject
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const AdminAI = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);

  // Documents
  const [documents, setDocuments] = useState([]);

  // Ingestion
  const [ingesting, setIngesting] = useState({ products: false, kb: false, all: false });

  // Test query
  const [testQuery, setTestQuery] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [querying, setQuerying] = useState(false);

  // Query history
  const [queryHistory, setQueryHistory] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes] = await Promise.all([
        api.get('/ai/documents', { params: { limit: 100 } }),
      ]);
      setDocuments(docsRes.data.data || []);

      // Try to fetch query history
      try {
        const histRes = await api.get('/ai/queries', { params: { limit: 20 } });
        setQueryHistory(histRes.data.data || []);
      } catch {
        setQueryHistory([]);
      }
    } catch (err) {
      showSnackbar('Failed to load AI data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const ingestProducts = async () => {
    setIngesting(i => ({ ...i, products: true }));
    try {
      await api.post('/ai/ingest/products');
      showSnackbar('Products ingested successfully', 'success');
      fetchData();
    } catch (err) {
      // Fallback: try generic ingest
      try {
        await api.post('/ai/ingest', { sourceType: 'PRODUCT', sourceId: 'bulk', title: 'Products', content: 'Bulk product ingestion triggered' });
        showSnackbar('Product ingestion initiated', 'success');
      } catch {
        showSnackbar('Ingestion endpoint not available', 'warning');
      }
    } finally {
      setIngesting(i => ({ ...i, products: false }));
    }
  };

  const ingestKB = async () => {
    setIngesting(i => ({ ...i, kb: true }));
    try {
      await api.post('/ai/ingest/kb');
      showSnackbar('KB articles ingested successfully', 'success');
      fetchData();
    } catch (err) {
      try {
        await api.post('/ai/ingest', { sourceType: 'KB_ARTICLE', sourceId: 'bulk', title: 'KB Articles', content: 'Bulk KB ingestion triggered' });
        showSnackbar('KB ingestion initiated', 'success');
      } catch {
        showSnackbar('Ingestion endpoint not available', 'warning');
      }
    } finally {
      setIngesting(i => ({ ...i, kb: false }));
    }
  };

  const ingestAll = async () => {
    setIngesting(i => ({ ...i, all: true }));
    try {
      await api.post('/ai/ingest/all');
      showSnackbar('All data ingested successfully', 'success');
      fetchData();
    } catch {
      // Fallback: ingest sequentially
      await ingestProducts();
      await ingestKB();
      showSnackbar('Ingestion complete', 'success');
    } finally {
      setIngesting(i => ({ ...i, all: false }));
    }
  };

  const runTestQuery = async () => {
    if (!testQuery.trim()) return;
    setQuerying(true);
    setTestResponse(null);
    try {
      const { data } = await api.post('/ai/query', { query: testQuery, context: 'admin' });
      setTestResponse(data.data);
    } catch (err) {
      showSnackbar('Query failed', 'error');
    } finally {
      setQuerying(false);
    }
  };

  const sourceTypeColor = (type) => {
    const map = {
      PRODUCT: 'primary', KB_ARTICLE: 'success', POLICY: 'info',
      FAQ: 'warning', SOP: 'secondary',
    };
    return map[type] || 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
          AI Assistant Management
        </Typography>
        <IconButton onClick={fetchData}><Refresh /></IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* Ingest Data */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudUpload /> Ingest Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ingest product data and knowledge base articles into the AI system for enhanced responses.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined" fullWidth
                startIcon={ingesting.products ? null : <DataObject />}
                onClick={ingestProducts} disabled={ingesting.products}
              >
                {ingesting.products ? <><LinearProgress sx={{ width: '100%', mr: 1 }} /> Ingesting...</> : 'Re-ingest Products'}
              </Button>
              <Button
                variant="outlined" fullWidth
                startIcon={ingesting.kb ? null : <Description />}
                onClick={ingestKB} disabled={ingesting.kb}
              >
                {ingesting.kb ? <><LinearProgress sx={{ width: '100%', mr: 1 }} /> Ingesting...</> : 'Re-ingest KB Articles'}
              </Button>
              <Divider />
              <Button
                variant="contained" fullWidth
                startIcon={ingesting.all ? null : <CloudUpload />}
                onClick={ingestAll} disabled={ingesting.all}
              >
                {ingesting.all ? <><LinearProgress sx={{ width: '100%', mr: 1 }} /> Ingesting All...</> : 'Ingest All'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Test Query */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology /> Test Query
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth size="small" placeholder="Ask a question to test the AI..."
                value={testQuery} onChange={e => setTestQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runTestQuery()}
              />
              <Button variant="contained" onClick={runTestQuery} disabled={querying || !testQuery.trim()}
                startIcon={<Send />}>
                {querying ? 'Querying...' : 'Send'}
              </Button>
            </Box>
            {querying && <LinearProgress sx={{ mb: 2 }} />}
            {testResponse && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToy fontSize="small" /> AI Response
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                    {testResponse.response}
                  </Typography>
                  {testResponse.citations?.length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>Citations:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {testResponse.citations.map((c, i) => (
                          <Chip
                            key={i} label={c.title || c.sourceType} size="small" variant="outlined"
                            color={sourceTypeColor(c.sourceType)}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                  {testResponse.safetyFlags && (testResponse.safetyFlags.medical || testResponse.safetyFlags.allergen) && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Safety flags triggered: {Object.entries(testResponse.safetyFlags).filter(([, v]) => v).map(([k]) => k).join(', ')}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </Paper>
        </Grid>

        {/* Document List */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description /> AI Documents
            </Typography>
            {loading ? (
              <Box>
                {[1, 2, 3].map(i => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}
              </Box>
            ) : documents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">No AI documents ingested yet. Use the ingest buttons above to get started.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Source Type</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell align="center">Chunks</TableCell>
                      <TableCell>Last Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map(doc => (
                      <TableRow key={doc.id} hover>
                        <TableCell>
                          <Chip label={doc.sourceType} size="small" color={sourceTypeColor(doc.sourceType)} sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{doc.title}</TableCell>
                        <TableCell align="center">{doc._count?.embeddings || 0}</TableCell>
                        <TableCell>{new Date(doc.updatedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Query History */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Search /> Query History
            </Typography>
            {queryHistory.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No AI queries recorded yet
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Query</TableCell>
                      <TableCell>Context</TableCell>
                      <TableCell>Response (Preview)</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {queryHistory.map(q => (
                      <TableRow key={q.id} hover>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.query}
                        </TableCell>
                        <TableCell>
                          <Chip label={q.context || 'customer'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {q.response?.substring(0, 100)}...
                        </TableCell>
                        <TableCell>{q.feedbackRating ? `${q.feedbackRating}/5` : '—'}</TableCell>
                        <TableCell>{new Date(q.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminAI;
