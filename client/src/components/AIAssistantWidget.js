import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Fab, Dialog, DialogTitle, DialogContent, TextField, IconButton,
  Typography, Paper, Stack, Chip, CircularProgress, Zoom
} from '@mui/material';
import { SmartToy, Send, Close, AutoAwesome } from '@mui/icons-material';
import api from '../services/api';

const AIAssistantWidget = ({ context = 'customer' }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: context === 'customer'
        ? "Hi! 👋 I'm the Painted Canyon Pastries assistant. I can help you find the perfect pastry, answer questions about our menu, check delivery availability, or help with your order. What can I help you with?"
        : "Hello! I'm your admin assistant. I can help with order analysis, production planning, customer communications, and more. What do you need?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/query', {
        query: userMessage,
        context,
        conversationHistory: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.data.response,
          citations: data.data.citations,
          safetyFlags: data.data.safetyFlags,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or contact us directly!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = context === 'customer'
    ? ['What are your best sellers?', 'Do you deliver to my area?', 'Any gluten-free options?']
    : ['Show today\'s orders', 'Low inventory items', 'Draft a delay email'];

  return (
    <>
      {/* Floating Button */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #c4956a 0%, #a67c52 100%)',
            boxShadow: '0 4px 20px rgba(196,149,106,0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #a67c52 0%, #8b6544 100%)',
            },
          }}
        >
          <SmartToy />
        </Fab>
      </Zoom>

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
            position: 'fixed',
            bottom: 16,
            right: 16,
            m: 0,
            width: { xs: '95vw', sm: 420 },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #c4956a 0%, #a67c52 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoAwesome sx={{ fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {context === 'customer' ? 'Pastry Assistant' : 'Admin Assistant'}
            </Typography>
          </Stack>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: 450 }}>
          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1.5,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    maxWidth: '85%',
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.50',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {msg.content}
                  </Typography>
                  {msg.citations?.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      {msg.citations.map((cite, j) => (
                        <Chip
                          key={j}
                          label={cite.title}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 22 }}
                        />
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <CircularProgress size={16} color="primary" />
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <Stack direction="row" spacing={0.5} sx={{ px: 2, pb: 1, flexWrap: 'wrap', gap: 0.5 }}>
              {quickQuestions.map((q) => (
                <Chip
                  key={q}
                  label={q}
                  size="small"
                  onClick={() => { setInput(q); }}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                />
              ))}
            </Stack>
          )}

          {/* Input */}
          <Box sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={loading}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || loading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': { bgcolor: 'grey.200' },
                }}
              >
                <Send fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIAssistantWidget;
