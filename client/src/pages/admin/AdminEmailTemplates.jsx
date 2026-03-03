import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Grid, Chip, IconButton,
  Alert, CircularProgress, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, Collapse, Tabs, Tab, Skeleton, FormControl,
  InputLabel, Select, MenuItem, LinearProgress,
} from '@mui/material';
import {
  Save, Refresh, Edit, RestartAlt, Send, Code, Visibility,
  ContentCopy, ArrowBack, ExpandMore, ExpandLess, Add, Delete,
  Upload, AutoAwesome, Close,
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const AdminEmailTemplates = () => {
  const { showSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // slug
  const [editData, setEditData] = useState({ subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [editorTab, setEditorTab] = useState(0); // 0=edit, 1=preview
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [varsExpanded, setVarsExpanded] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Add Template dialog state ──────────────────────────
  const [addDialog, setAddDialog] = useState(false);
  const [addMode, setAddMode] = useState('blank'); // 'blank' | 'upload' | 'ai'
  const [addForm, setAddForm] = useState({ name: '', description: '', subject: '' });
  const [creating, setCreating] = useState(false);

  // Upload mode
  const [uploadHtml, setUploadHtml] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

  // AI mode
  const [aiForm, setAiForm] = useState({ purpose: '', tone: 'warm, friendly, professional' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState(null); // { body, variables, subject }

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/email-templates');
      setTemplates(data.data || []);
    } catch (err) {
      showSnackbar('Failed to load email templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const currentTemplate = templates.find(t => t.slug === selected);

  const handleSelect = (slug) => {
    const tpl = templates.find(t => t.slug === slug);
    setSelected(slug);
    setEditData({ subject: tpl.subject, body: tpl.body });
    setPreviewHtml('');
    setPreviewSubject('');
    setEditorTab(0);
  };

  const handleBack = () => {
    setSelected(null);
    setEditData({ subject: '', body: '' });
    setPreviewHtml('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/email-templates/${selected}`, editData);
      showSnackbar('Template saved', 'success');
      fetchTemplates();
    } catch (err) {
      showSnackbar('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      await api.put(`/email-templates/${selected}`, editData);
      const { data } = await api.post(`/email-templates/${selected}/preview`);
      setPreviewHtml(data.data.html);
      setPreviewSubject(data.data.subject);
      setEditorTab(1);
    } catch (err) {
      showSnackbar('Failed to generate preview', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data } = await api.post(`/email-templates/${selected}/reset`);
      setEditData({ subject: data.data.subject, body: data.data.body });
      showSnackbar('Template reset to default', 'success');
      setResetDialog(false);
      fetchTemplates();
    } catch (err) {
      showSnackbar('Failed to reset template', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) { showSnackbar('Enter an email address', 'error'); return; }
    setSendingTest(true);
    try {
      await api.put(`/email-templates/${selected}`, editData);
      const { data } = await api.post(`/email-templates/${selected}/send-test`, { email: testEmail });
      showSnackbar(data.message || 'Test email sent!', 'success');
      setTestEmailDialog(false);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to send test email', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/email-templates/${selected}`);
      showSnackbar('Template deleted', 'success');
      setDeleteDialog(false);
      handleBack();
      fetchTemplates();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete template', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const insertTag = (tag) => {
    const textarea = bodyRef.current?.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = editData.body.substring(0, start) + tag + editData.body.substring(end);
    setEditData(d => ({ ...d, body: newBody }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const hasChanges = currentTemplate &&
    (editData.subject !== currentTemplate.subject || editData.body !== currentTemplate.body);

  // ── Add dialog helpers ─────────────────────────────────
  const resetAddDialog = () => {
    setAddDialog(false);
    setAddMode('blank');
    setAddForm({ name: '', description: '', subject: '' });
    setUploadHtml('');
    setUploadFileName('');
    setAiForm({ purpose: '', tone: 'warm, friendly, professional' });
    setAiPreview(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm') && file.type !== 'text/html') {
      showSnackbar('Please upload an HTML file', 'error');
      return;
    }
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadHtml(event.target.result);
      if (!addForm.name) {
        setAddForm(f => ({ ...f, name: file.name.replace(/\.(html?|htm)$/i, '').replace(/[-_]/g, ' ') }));
      }
    };
    reader.readAsText(file);
  };

  const handleAiGenerate = async () => {
    if (!addForm.name || !aiForm.purpose) {
      showSnackbar('Name and purpose are required', 'error');
      return;
    }
    setAiGenerating(true);
    try {
      const { data } = await api.post('/email-templates/generate', {
        name: addForm.name,
        purpose: aiForm.purpose,
        tone: aiForm.tone,
        mergeTags: [],
      });
      setAiPreview(data.data);
      showSnackbar('Template generated! Review it below.', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to generate template', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!addForm.name) { showSnackbar('Template name is required', 'error'); return; }
    setCreating(true);
    try {
      let payload;
      if (addMode === 'upload') {
        if (!uploadHtml) { showSnackbar('Please upload an HTML file', 'error'); setCreating(false); return; }
        const { data } = await api.post('/email-templates/upload', {
          name: addForm.name,
          description: addForm.description,
          subject: addForm.subject,
          htmlContent: uploadHtml,
        });
        showSnackbar(`Template "${data.data.name}" created from upload`, 'success');
      } else if (addMode === 'ai' && aiPreview) {
        const { data } = await api.post('/email-templates', {
          name: addForm.name,
          description: aiPreview.description || addForm.description,
          subject: aiPreview.subject || addForm.subject,
          body: aiPreview.body,
          variables: aiPreview.variables,
        });
        showSnackbar(`AI template "${data.data.name}" created`, 'success');
      } else {
        // Blank
        const { data } = await api.post('/email-templates', {
          name: addForm.name,
          description: addForm.description,
          subject: addForm.subject,
        });
        showSnackbar(`Template "${data.data.name}" created`, 'success');
      }
      resetAddDialog();
      fetchTemplates();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create template', 'error');
    } finally {
      setCreating(false);
    }
  };

  // ── Template List View ─────────────────────────────────
  if (!selected) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Email Templates</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setAddDialog(true)}>
              Add Template
            </Button>
            <IconButton onClick={fetchTemplates} disabled={loading}><Refresh /></IconButton>
          </Box>
        </Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          Customize the automated email notifications sent to customers. Click a template to edit its subject line and HTML body. Merge tags like <code>{'{{customerName}}'}</code> are replaced with real data when sent.
        </Alert>
        {loading ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} height={72} sx={{ mb: 1 }} />)
        ) : (
          templates.map((tpl) => (
            <Paper
              key={tpl.slug}
              variant="outlined"
              sx={{
                p: 2, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
              onClick={() => handleSelect(tpl.slug)}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{tpl.name}</Typography>
                  {tpl.isCustom && (
                    <Chip label="Custom" size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">{tpl.description}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }} noWrap>
                  Subject: {tpl.subject}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Button size="small" variant="outlined" startIcon={<Edit />} onClick={(e) => { e.stopPropagation(); handleSelect(tpl.slug); }}>
                  Edit
                </Button>
                <IconButton size="small" color="error"
                  onClick={(e) => { e.stopPropagation(); setSelected(tpl.slug); setDeleteDialog(true); }}
                  title="Delete template">
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Paper>
          ))
        )}

        {/* Add Template Dialog */}
        <Dialog open={addDialog} onClose={resetAddDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Add Email Template
            <IconButton onClick={resetAddDialog} size="small"><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            {/* Mode selector */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, mt: 1 }}>
              {[
                { mode: 'blank', label: 'Blank Template', icon: <Add /> },
                { mode: 'upload', label: 'Upload HTML', icon: <Upload /> },
                { mode: 'ai', label: 'AI Generate', icon: <AutoAwesome /> },
              ].map(({ mode, label, icon }) => (
                <Paper
                  key={mode}
                  variant="outlined"
                  sx={{
                    flex: 1, p: 2, textAlign: 'center', cursor: 'pointer',
                    border: 2, transition: 'all 0.15s',
                    borderColor: addMode === mode ? 'primary.main' : 'divider',
                    bgcolor: addMode === mode ? 'primary.50' : 'transparent',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                  onClick={() => { setAddMode(mode); setAiPreview(null); }}
                >
                  <Box sx={{ color: addMode === mode ? 'primary.main' : 'text.secondary', mb: 0.5 }}>{icon}</Box>
                  <Typography variant="body2" sx={{ fontWeight: addMode === mode ? 600 : 400 }}>{label}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Common fields */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Template Name" value={addForm.name} required
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Holiday Special, Birthday Offer"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Subject Line (optional)" value={addForm.subject}
                  onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Leave blank for auto-generated"
                  helperText="Use {{bakeryName}}, {{customerName}} etc."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of when this template is used"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Upload Mode */}
            {addMode === 'upload' && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Upload HTML File</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload a .html file. Merge tags like {'{{customerName}}'} in the HTML will be auto-detected.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button variant="outlined" component="label" startIcon={<Upload />}>
                    Choose File
                    <input type="file" hidden accept=".html,.htm,text/html" ref={fileInputRef} onChange={handleFileUpload} />
                  </Button>
                  {uploadFileName && (
                    <Chip label={uploadFileName} onDelete={() => { setUploadHtml(''); setUploadFileName(''); }} size="small" />
                  )}
                </Box>
                {uploadHtml && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="success.main" sx={{ mb: 1, display: 'block' }}>
                      File loaded ({Math.round(uploadHtml.length / 1024)}KB)
                    </Typography>
                    <Paper variant="outlined" sx={{ overflow: 'hidden', maxHeight: 300 }}>
                      <iframe title="Upload Preview" srcDoc={uploadHtml} style={{ width: '100%', height: 280, border: 'none' }} />
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {/* AI Mode */}
            {addMode === 'ai' && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  <AutoAwesome sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom', color: 'primary.main' }} />
                  AI Template Generator
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Describe the purpose of the email and our AI will generate a branded HTML template for you.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Purpose / What this email is for" value={aiForm.purpose}
                      onChange={e => setAiForm(f => ({ ...f, purpose: e.target.value }))}
                      placeholder="e.g., Announce a new seasonal menu, Birthday discount offer, Thank customer for a review, Weekly specials newsletter"
                      multiline rows={2} required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tone</InputLabel>
                      <Select value={aiForm.tone} label="Tone"
                        onChange={e => setAiForm(f => ({ ...f, tone: e.target.value }))}>
                        <MenuItem value="warm, friendly, professional">Warm & Friendly</MenuItem>
                        <MenuItem value="elegant, sophisticated, luxurious">Elegant & Sophisticated</MenuItem>
                        <MenuItem value="fun, playful, energetic">Fun & Playful</MenuItem>
                        <MenuItem value="minimal, clean, modern">Minimal & Modern</MenuItem>
                        <MenuItem value="rustic, artisanal, homestyle">Rustic & Artisanal</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      variant="contained" fullWidth startIcon={<AutoAwesome />}
                      onClick={handleAiGenerate}
                      disabled={aiGenerating || !addForm.name || !aiForm.purpose}
                      sx={{ height: 56 }}
                    >
                      {aiGenerating ? 'Generating...' : 'Generate Template'}
                    </Button>
                  </Grid>
                </Grid>
                {aiGenerating && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      AI is crafting your template... this may take a moment.
                    </Typography>
                  </Box>
                )}
                {aiPreview && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Template generated! Preview below. You can create it now and fine-tune in the editor.
                    </Alert>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Subject: {aiPreview.subject}
                    </Typography>
                    <Paper variant="outlined" sx={{ mt: 1, overflow: 'hidden', maxHeight: 400 }}>
                      <iframe title="AI Preview" srcDoc={aiPreview.body} style={{ width: '100%', height: 380, border: 'none' }} />
                    </Paper>
                    {aiPreview.variables?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Detected merge tags:{' '}
                          {aiPreview.variables.map(v => (
                            <Chip key={v.tag} label={v.tag} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }} />
                          ))}
                        </Typography>
                      </Box>
                    )}
                    <Button variant="outlined" size="small" startIcon={<AutoAwesome />} onClick={handleAiGenerate}
                      disabled={aiGenerating} sx={{ mt: 1 }}>
                      Regenerate
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Blank Mode */}
            {addMode === 'blank' && (
              <Box>
                <Alert severity="info" icon={<Code />}>
                  A starter template with the bakery header/footer will be created. You can customize it in the editor after creation.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={resetAddDialog}>Cancel</Button>
            <Button
              variant="contained" onClick={handleCreateTemplate}
              disabled={creating || !addForm.name || (addMode === 'upload' && !uploadHtml) || (addMode === 'ai' && !aiPreview)}
              startIcon={creating ? <CircularProgress size={16} /> : <Add />}
            >
              {creating ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }

  // ── Template Editor View ───────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleBack} size="small"><ArrowBack /></IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{currentTemplate?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{currentTemplate?.description}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" color="error" startIcon={<Delete />}
            onClick={() => setDeleteDialog(true)}>
            Delete
          </Button>
          {!currentTemplate?.isCustom && (
            <Button size="small" variant="outlined" color="warning" startIcon={<RestartAlt />}
              onClick={() => setResetDialog(true)}>
              Reset
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<Send />}
            onClick={() => setTestEmailDialog(true)}>
            Send Test
          </Button>
          <Button size="small" variant="outlined" startIcon={<Visibility />}
            onClick={handlePreview} disabled={previewing}>
            {previewing ? 'Loading...' : 'Preview'}
          </Button>
          <Button size="small" variant="contained" startIcon={<Save />}
            onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Paper>

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes.
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Editor / Preview */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <Tabs value={editorTab} onChange={(e, v) => setEditorTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab icon={<Code />} iconPosition="start" label="HTML Editor" />
              <Tab icon={<Visibility />} iconPosition="start" label="Preview" />
            </Tabs>

            {editorTab === 0 && (
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth label="Subject Line" value={editData.subject}
                  onChange={e => setEditData(d => ({ ...d, subject: e.target.value }))}
                  sx={{ mb: 2 }}
                  helperText="You can use merge tags in the subject too"
                />
                <TextField
                  ref={bodyRef}
                  fullWidth label="HTML Body" value={editData.body}
                  onChange={e => setEditData(d => ({ ...d, body: e.target.value }))}
                  multiline rows={22}
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5 },
                  }}
                />
              </Box>
            )}

            {editorTab === 1 && (
              <Box sx={{ p: 2 }}>
                {previewHtml ? (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>Subject:</strong> {previewSubject}
                    </Alert>
                    <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
                      <iframe
                        title="Email Preview"
                        srcDoc={previewHtml}
                        style={{ width: '100%', minHeight: 500, border: 'none' }}
                      />
                    </Paper>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <Visibility sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                    <Typography>Click "Preview" to see a rendered version with sample data.</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Merge Tags Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setVarsExpanded(v => !v)}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Merge Tags
              </Typography>
              {varsExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={varsExpanded}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Click a tag to insert it at the cursor position in the HTML body.
              </Typography>
              {currentTemplate?.variables?.map((v) => (
                <Box key={v.tag} sx={{ mb: 1 }}>
                  <Tooltip title={`Click to insert ${v.tag}`} placement="left">
                    <Chip
                      label={v.tag}
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => insertTag(v.tag)}
                      onDelete={() => {
                        navigator.clipboard.writeText(v.tag);
                        showSnackbar(`Copied ${v.tag}`, 'info');
                      }}
                      deleteIcon={<ContentCopy sx={{ fontSize: '14px !important' }} />}
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem', cursor: 'pointer', mr: 0.5 }}
                    />
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 0.5, mt: 0.25 }}>
                    {v.description}
                  </Typography>
                </Box>
              ))}
            </Collapse>
          </Paper>

          {/* Tips */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Tips</Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Use inline CSS styles — most email clients don't support {'<style>'} blocks.</li>
                <li>Keep layouts simple — use tables for complex layouts.</li>
                <li>Test in multiple email clients (Gmail, Outlook, Apple Mail).</li>
                <li>Use "Send Test" to preview in a real inbox.</li>
                <li>Conditional blocks: <code>{'{{#tag}}'}...{'{{/tag}}'}</code> only show if the value exists.</li>
                <li>"Reset" restores the original default template.</li>
              </ul>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => { setDeleteDialog(false); if (!editData.body) setSelected(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Permanently delete <strong>{currentTemplate?.name}</strong>? This cannot be undone.
          </Typography>
          {!currentTemplate?.isCustom && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is a built-in template. You can re-add it later by resetting your email templates.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialog(false); if (!editData.body) setSelected(null); }} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Template?</DialogTitle>
        <DialogContent>
          <Typography>
            This will restore <strong>{currentTemplate?.name}</strong> to its original default.
            Your customizations will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)} disabled={resetting}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Resetting...' : 'Reset to Default'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Test Email Dialog */}
      <Dialog open={testEmailDialog} onClose={() => setTestEmailDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a test version of <strong>{currentTemplate?.name}</strong> with sample data to verify how it looks.
          </Typography>
          <TextField
            fullWidth label="Email Address" type="email" value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            autoFocus placeholder="you@example.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailDialog(false)} disabled={sendingTest}>Cancel</Button>
          <Button variant="contained" startIcon={<Send />} onClick={handleSendTest} disabled={sendingTest || !testEmail}>
            {sendingTest ? 'Sending...' : 'Send Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminEmailTemplates;
