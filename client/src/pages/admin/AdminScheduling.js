import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, TextField, Grid, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Divider, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent
} from '@mui/material';
import {
  Add, Delete, Refresh, CalendarMonth, AccessTime, Block, AutoFixHigh
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AdminScheduling = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);

  // Store hours
  const [storeHours, setStoreHours] = useState([]);
  const [hoursEditing, setHoursEditing] = useState(false);
  const [hoursDraft, setHoursDraft] = useState([]);

  // Timeslots
  const [timeslots, setTimeslots] = useState([]);

  // Blackout dates
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [blackoutDialog, setBlackoutDialog] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({ date: '', reason: '' });

  // Generate slots
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    startDate: '', endDate: '', type: 'PICKUP', maxCapacity: 25,
    slots: [{ startTime: '09:00', endTime: '10:00' }],
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hoursRes, slotsRes, blackoutRes] = await Promise.all([
        api.get('/timeslots/store-hours'),
        api.get('/timeslots', { params: { days: 14 } }),
        api.get('/timeslots/blackout-dates'),
      ]);
      const hours = hoursRes.data.data || [];
      setStoreHours(hours);
      setHoursDraft(DAYS.map((_, i) => {
        const existing = hours.find(h => h.dayOfWeek === i);
        return existing || { dayOfWeek: i, openTime: '07:00', closeTime: '18:00', isClosed: false };
      }));
      setTimeslots(slotsRes.data.data || []);
      setBlackoutDates(blackoutRes.data.data || []);
    } catch (err) {
      showSnackbar('Failed to load scheduling data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveStoreHours = async () => {
    setSaving(true);
    try {
      await api.put('/timeslots/store-hours', { hours: hoursDraft });
      showSnackbar('Store hours updated', 'success');
      setHoursEditing(false);
      fetchData();
    } catch (err) {
      showSnackbar('Failed to save store hours', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBlackoutDate = async () => {
    if (!blackoutForm.date) { showSnackbar('Date is required', 'error'); return; }
    try {
      await api.post('/timeslots/blackout-dates', blackoutForm);
      showSnackbar('Blackout date added', 'success');
      setBlackoutDialog(false);
      setBlackoutForm({ date: '', reason: '' });
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to add blackout date', 'error');
    }
  };

  const deleteBlackout = async (id) => {
    try {
      await api.delete(`/timeslots/blackout-dates/${id}`);
      showSnackbar('Blackout date removed', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('Failed to delete', 'error');
    }
  };

  const generateTimeslots = async () => {
    if (!generateForm.startDate || !generateForm.endDate) {
      showSnackbar('Start and end dates are required', 'error'); return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/timeslots/generate', generateForm);
      showSnackbar(`Generated ${data.meta?.count || 0} timeslots`, 'success');
      setGenerateDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to generate timeslots', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSlotRow = () => {
    setGenerateForm(f => ({
      ...f,
      slots: [...f.slots, { startTime: '', endTime: '' }],
    }));
  };

  const removeSlotRow = (idx) => {
    setGenerateForm(f => ({
      ...f,
      slots: f.slots.filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main', mb: 3 }}>Scheduling</Typography>
        {[1, 2, 3].map(i => <Skeleton key={i} height={200} sx={{ mb: 2, borderRadius: 2 }} />)}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>Scheduling</Typography>
        <IconButton onClick={fetchData}><Refresh /></IconButton>
      </Box>

      {/* Store Hours */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTime /> Store Hours
          </Typography>
          {hoursEditing ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setHoursEditing(false)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={saveStoreHours} disabled={saving}>Save</Button>
            </Box>
          ) : (
            <Button size="small" onClick={() => setHoursEditing(true)}>Edit</Button>
          )}
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Open</TableCell>
                <TableCell>Close</TableCell>
                <TableCell align="center">Closed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hoursDraft.map((h, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontWeight: 600 }}>{DAYS[h.dayOfWeek]}</TableCell>
                  <TableCell>
                    {hoursEditing ? (
                      <TextField
                        size="small" type="time" value={h.openTime}
                        onChange={e => {
                          const updated = [...hoursDraft];
                          updated[i] = { ...updated[i], openTime: e.target.value };
                          setHoursDraft(updated);
                        }}
                        disabled={h.isClosed}
                        sx={{ width: 140 }}
                      />
                    ) : (
                      <Typography variant="body2" color={h.isClosed ? 'text.disabled' : 'text.primary'}>
                        {h.isClosed ? '—' : h.openTime}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {hoursEditing ? (
                      <TextField
                        size="small" type="time" value={h.closeTime}
                        onChange={e => {
                          const updated = [...hoursDraft];
                          updated[i] = { ...updated[i], closeTime: e.target.value };
                          setHoursDraft(updated);
                        }}
                        disabled={h.isClosed}
                        sx={{ width: 140 }}
                      />
                    ) : (
                      <Typography variant="body2" color={h.isClosed ? 'text.disabled' : 'text.primary'}>
                        {h.isClosed ? '—' : h.closeTime}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {hoursEditing ? (
                      <Switch
                        size="small" checked={h.isClosed}
                        onChange={e => {
                          const updated = [...hoursDraft];
                          updated[i] = { ...updated[i], isClosed: e.target.checked };
                          setHoursDraft(updated);
                        }}
                      />
                    ) : (
                      h.isClosed && <Chip label="Closed" size="small" color="error" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Grid container spacing={3}>
        {/* Pickup/Delivery Window Config & Generate */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth /> Timeslot Windows
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {timeslots.length} timeslots configured for the next 14 days
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {['PICKUP', 'DELIVERY'].map(type => {
                const count = timeslots.filter(t => t.type === type).length;
                return (
                  <Chip key={type} label={`${type}: ${count} slots`} variant="outlined" size="small" />
                );
              })}
            </Box>
            <Button
              variant="contained" startIcon={<AutoFixHigh />} fullWidth
              onClick={() => setGenerateDialog(true)}
            >
              Generate Timeslots
            </Button>
          </Paper>
        </Grid>

        {/* Blackout Dates */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Block /> Blackout Dates
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={() => setBlackoutDialog(true)}>Add</Button>
            </Box>
            {blackoutDates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No blackout dates set</Typography>
            ) : (
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {blackoutDates.map(bd => (
                  <Box key={bd.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(bd.date).toLocaleDateString()}
                      </Typography>
                      {bd.reason && <Typography variant="caption" color="text.secondary">{bd.reason}</Typography>}
                    </Box>
                    <IconButton size="small" color="error" onClick={() => deleteBlackout(bd.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Generate Timeslots Dialog */}
      <Dialog open={generateDialog} onClose={() => setGenerateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Timeslots</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Start Date" value={generateForm.startDate}
                onChange={e => setGenerateForm(f => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="End Date" value={generateForm.endDate}
                onChange={e => setGenerateForm(f => ({ ...f, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={generateForm.type} label="Type"
                  onChange={e => setGenerateForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="PICKUP">Pickup</MenuItem>
                  <MenuItem value="DELIVERY">Delivery</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Capacity per Slot" value={generateForm.maxCapacity}
                onChange={e => setGenerateForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) || 25 }))} />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Time Windows</Typography>
                <Button size="small" startIcon={<Add />} onClick={addSlotRow}>Add Window</Button>
              </Box>
              {generateForm.slots.map((slot, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField size="small" type="time" label="Start" value={slot.startTime}
                    onChange={e => {
                      const updated = [...generateForm.slots];
                      updated[idx] = { ...updated[idx], startTime: e.target.value };
                      setGenerateForm(f => ({ ...f, slots: updated }));
                    }}
                    InputLabelProps={{ shrink: true }} sx={{ flex: 1 }}
                  />
                  <TextField size="small" type="time" label="End" value={slot.endTime}
                    onChange={e => {
                      const updated = [...generateForm.slots];
                      updated[idx] = { ...updated[idx], endTime: e.target.value };
                      setGenerateForm(f => ({ ...f, slots: updated }));
                    }}
                    InputLabelProps={{ shrink: true }} sx={{ flex: 1 }}
                  />
                  <IconButton size="small" color="error" onClick={() => removeSlotRow(idx)} disabled={generateForm.slots.length <= 1}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={generateTimeslots} disabled={saving}>
            {saving ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Blackout Dialog */}
      <Dialog open={blackoutDialog} onClose={() => setBlackoutDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Blackout Date</DialogTitle>
        <DialogContent>
          <TextField fullWidth type="date" label="Date" value={blackoutForm.date}
            onChange={e => setBlackoutForm(f => ({ ...f, date: e.target.value }))}
            InputLabelProps={{ shrink: true }} sx={{ mt: 2, mb: 2 }} />
          <TextField fullWidth label="Reason" value={blackoutForm.reason}
            onChange={e => setBlackoutForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="e.g., Holiday, Maintenance" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlackoutDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={addBlackoutDate}>Add</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminScheduling;
