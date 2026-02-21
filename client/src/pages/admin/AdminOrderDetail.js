import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Paper, Card, CardContent, Button,
  TextField, Chip, Divider, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Select, MenuItem, FormControl,
  InputLabel, Checkbox, FormControlLabel, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert
} from '@mui/material';
import {
  ArrowBack, Print, MoneyOff, CheckCircle, LocalShipping, AccessTime,
  Warning, Person, ShoppingBag, Edit, Save
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

const STATUS_FLOW = ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];

const statusColor = (status) => {
  const map = {
    NEW: '#2196f3', CONFIRMED: '#c4956a', IN_PRODUCTION: '#ff9800',
    READY: '#4caf50', OUT_FOR_DELIVERY: '#9c27b0', COMPLETED: '#7c8b6f',
    REFUNDED: '#c62828', CANCELLED: '#999',
  };
  return map[status] || '#999';
};

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [productionNotes, setProductionNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [packaging, setPackaging] = useState({});
  const [bakerId, setBakerId] = useState('');
  const [bakers, setBakers] = useState([]);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${id}`);
      const o = data.data;
      setOrder(o);
      setProductionNotes(o.productionNotes || '');
      setBakerId(o.assignedBakerId || '');
      setPackaging(o.packagingChecklist || {
        boxed: false, labeled: false, receipt: false, utensils: false, napkins: false,
      });
    } catch (err) {
      showSnackbar('Failed to load order', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const advanceStatus = async () => {
    if (!order) return;
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];

    setSaving(true);
    try {
      await api.patch(`/orders/${id}/status`, { status: nextStatus });
      showSnackbar(`Order advanced to ${nextStatus.replace(/_/g, ' ')}`, 'success');
      fetchOrder();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/orders/${id}/status`, {
        status: order.status,
        productionNotes,
        packagingChecklist: packaging,
        assignedBakerId: bakerId || undefined,
      });
      showSnackbar('Order updated', 'success');
      setNotesEditing(false);
      fetchOrder();
    } catch (err) {
      showSnackbar('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    setSaving(true);
    try {
      await api.post(`/orders/${id}/refund`, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason,
      });
      showSnackbar('Refund processed', 'success');
      setRefundDialogOpen(false);
      fetchOrder();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Refund failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Container>
    );
  }

  if (!order) {
    return (
      <Container maxWidth="xl" sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Order not found</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/orders')}>Back to Orders</Button>
      </Container>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : order.guestFirstName ? `${order.guestFirstName} ${order.guestLastName || ''}` : 'Guest';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/admin/orders')}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
            {order.orderNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Created {new Date(order.createdAt).toLocaleString()}
          </Typography>
        </Box>
        <Chip
          label={order.status.replace(/_/g, ' ')}
          sx={{ bgcolor: statusColor(order.status) + '20', color: statusColor(order.status), fontWeight: 700, fontSize: '0.85rem', px: 1 }}
        />
      </Box>

      {/* Status Workflow */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto' }}>
          {STATUS_FLOW.map((s, i) => (
            <React.Fragment key={s}>
              <Chip
                label={s.replace(/_/g, ' ')}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: i <= currentIdx ? statusColor(s) + '20' : 'transparent',
                  color: i <= currentIdx ? statusColor(s) : 'text.disabled',
                  border: i === currentIdx ? `2px solid ${statusColor(s)}` : '1px solid transparent',
                }}
              />
              {i < STATUS_FLOW.length - 1 && <Box sx={{ width: 20, height: 2, bgcolor: i < currentIdx ? 'primary.main' : 'divider' }} />}
            </React.Fragment>
          ))}
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 && (
              <Button variant="contained" size="small" onClick={advanceStatus} disabled={saving} startIcon={<CheckCircle />}>
                Advance to {STATUS_FLOW[currentIdx + 1].replace(/_/g, ' ')}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Order Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Order Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Fulfillment</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.fulfillmentType}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Payment</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.paymentMethod}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Paid</Typography>
                <Chip label={order.isPaid ? 'Yes' : 'No'} size="small" color={order.isPaid ? 'success' : 'warning'} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Source</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.source}</Typography>
              </Grid>
              {order.scheduledDate && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Scheduled</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(order.scheduledDate).toLocaleDateString()}</Typography>
                </Grid>
              )}
              {order.deliveryAddress && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Delivery Address</Typography>
                  <Typography variant="body2">{order.deliveryAddress}, {order.deliveryZip}</Typography>
                  {order.deliveryNotes && <Typography variant="caption" color="text.secondary">Notes: {order.deliveryNotes}</Typography>}
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Customer Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" /> Customer
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{customerName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {order.customer?.email || order.guestEmail || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.customer?.phone || order.guestPhone || '—'}
            </Typography>
          </Paper>

          {/* Items */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingBag fontSize="small" /> Items
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Variant</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map(item => (
                    <React.Fragment key={item.id}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>{item.product?.name || 'Product'}</TableCell>
                        <TableCell>{item.variant?.name || '—'}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                      </TableRow>
                      {item.addons?.map(addon => (
                        <TableRow key={addon.id}>
                          <TableCell sx={{ pl: 4, color: 'text.secondary', fontSize: '0.8rem' }}>
                            + {addon.addon?.name || 'Add-on'}
                            {addon.value && ` — "${addon.value}"`}
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            ${parseFloat(addon.price).toFixed(2)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      ))}
                      {item.notes && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ pl: 4, fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>
                            Note: {item.notes}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">${parseFloat(order.subtotal).toFixed(2)}</Typography>
              </Box>
              {parseFloat(order.discountAmount) > 0 && (
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" color="text.secondary">Discount</Typography>
                  <Typography variant="body2" color="error.main">-${parseFloat(order.discountAmount).toFixed(2)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography variant="body2" color="text.secondary">Tax</Typography>
                <Typography variant="body2">${parseFloat(order.taxAmount).toFixed(2)}</Typography>
              </Box>
              {parseFloat(order.deliveryFee) > 0 && (
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" color="text.secondary">Delivery Fee</Typography>
                  <Typography variant="body2">${parseFloat(order.deliveryFee).toFixed(2)}</Typography>
                </Box>
              )}
              {parseFloat(order.tipAmount) > 0 && (
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" color="text.secondary">Tip</Typography>
                  <Typography variant="body2">${parseFloat(order.tipAmount).toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ width: 200, my: 0.5 }} />
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>${parseFloat(order.totalAmount).toFixed(2)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Production Notes */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Production Notes</Typography>
              {!notesEditing ? (
                <IconButton size="small" onClick={() => setNotesEditing(true)}><Edit fontSize="small" /></IconButton>
              ) : (
                <Button size="small" startIcon={<Save />} onClick={saveNotes} disabled={saving}>Save</Button>
              )}
            </Box>
            <TextField
              fullWidth multiline rows={3}
              value={productionNotes}
              onChange={e => setProductionNotes(e.target.value)}
              disabled={!notesEditing}
              placeholder="Add production notes..."
              variant="outlined"
            />
          </Paper>

          {/* Packaging Checklist */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Packaging Checklist</Typography>
            <Grid container spacing={1}>
              {Object.entries(packaging).map(([key, val]) => (
                <Grid item xs={6} sm={4} key={key}>
                  <FormControlLabel
                    control={<Checkbox checked={!!val} onChange={e => setPackaging(p => ({ ...p, [key]: e.target.checked }))} />}
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                  />
                </Grid>
              ))}
            </Grid>
            <Button size="small" sx={{ mt: 1 }} onClick={saveNotes} disabled={saving}>
              Save Checklist
            </Button>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Actions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Assign Baker</InputLabel>
                <Select value={bakerId} label="Assign Baker" onChange={e => setBakerId(e.target.value)}>
                  <MenuItem value="">Unassigned</MenuItem>
                  {bakers.map(b => <MenuItem key={b.id} value={b.id}>{b.firstName} {b.lastName}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>
                Print Pack Slip
              </Button>
              <Button
                variant="outlined" color="error" startIcon={<MoneyOff />}
                onClick={() => { setRefundAmount(order.totalAmount); setRefundDialogOpen(true); }}
                disabled={order.status === 'REFUNDED'}
              >
                {order.status === 'REFUNDED' ? 'Already Refunded' : 'Issue Refund'}
              </Button>
            </Box>
          </Paper>

          {/* Timeline */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime fontSize="small" /> Timeline
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(order.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Order Created</Typography>
                <Typography variant="caption" color="text.secondary">Status: NEW</Typography>
              </Box>
              {order.updatedAt !== order.createdAt && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(order.updatedAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Last Updated</Typography>
                  <Typography variant="caption" color="text.secondary">Status: {order.status}</Typography>
                </Box>
              )}
              {order.isPaid && order.paidAt && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(order.paidAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>Payment Received</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Allergen Warnings */}
          {order.items?.some(i => i.product?.allergenTags?.length > 0) && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning fontSize="small" /> Allergen Alert
                </Typography>
                <Typography variant="caption">
                  This order contains items with allergen tags. Check before packaging.
                </Typography>
              </Alert>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue Refund</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Refund Amount" type="number" value={refundAmount}
            onChange={e => setRefundAmount(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            helperText={`Order total: $${parseFloat(order.totalAmount).toFixed(2)}`}
          />
          <TextField
            fullWidth label="Reason" multiline rows={2} value={refundReason}
            onChange={e => setRefundReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRefund} disabled={saving}>
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminOrderDetail;
