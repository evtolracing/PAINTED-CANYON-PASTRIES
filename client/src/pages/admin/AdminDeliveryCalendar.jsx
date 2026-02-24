import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Container, Box, Typography, Paper, IconButton, Button, Chip, Tooltip,
  Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Badge, Avatar, Divider,
  useTheme, alpha, Alert, CircularProgress, Card
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Today, LocalShipping, StorefrontOutlined,
  DirectionsWalk, CalendarMonth, FilterList, Refresh, DragIndicator,
  AccessTime, Person, AttachMoney, InfoOutlined
} from '@mui/icons-material';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  isToday, parseISO, getDay, differenceInCalendarDays
} from 'date-fns';
import api from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';

/* ── status config ─────────────────────────────────────────── */
const STATUS_COLORS = {
  NEW:              { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1',   label: 'New' },
  CONFIRMED:        { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20',   label: 'Confirmed' },
  IN_PRODUCTION:    { bg: '#fff3e0', border: '#f57c00', text: '#e65100',   label: 'In Prod' },
  READY:            { bg: '#e0f2f1', border: '#00897b', text: '#004d40',   label: 'Ready' },
  OUT_FOR_DELIVERY: { bg: '#f3e5f5', border: '#8e24aa', text: '#4a148c',   label: 'Out' },
  COMPLETED:        { bg: '#e8eaf6', border: '#5c6bc0', text: '#283593',   label: 'Done' },
  CANCELLED:        { bg: '#fce4ec', border: '#e53935', text: '#b71c1c',   label: 'Cancelled' },
  REFUNDED:         { bg: '#efebe9', border: '#8d6e63', text: '#3e2723',   label: 'Refunded' },
};

const FULFILLMENT_ICONS = {
  DELIVERY: <LocalShipping fontSize="inherit" />,
  PICKUP:   <StorefrontOutlined fontSize="inherit" />,
  WALKIN:   <DirectionsWalk fontSize="inherit" />,
};

/* ── draggable order card ──────────────────────────────────── */
const OrderCard = React.memo(({ order, onDetailClick }) => {
  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.NEW;
  const customerName = order.customer
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    : order.guestFirstName
      ? `${order.guestFirstName} ${order.guestLastName || ''}`.trim()
      : 'Guest';

  // Derive time display from timeslot or scheduledSlot
  const timeDisplay = order.timeslot
    ? `${order.timeslot.startTime}–${order.timeslot.endTime}`
    : order.scheduledSlot || null;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      orderId: order.id,
      orderNumber: order.orderNumber,
      fromDate: order.scheduledDate,
    }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  return (
    <Box
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onDetailClick(order)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        mb: 0.5,
        borderRadius: 1,
        bgcolor: sc.bg,
        borderLeft: `3px solid ${sc.border}`,
        cursor: 'grab',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-1px)',
        },
        '&:active': { cursor: 'grabbing' },
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <DragIndicator sx={{ fontSize: 14, color: sc.text, opacity: 0.5, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '0.7rem', fontWeight: 700, color: sc.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {order.orderNumber?.replace('PCP-', '')}
        </Typography>
        <Typography
          sx={{ fontSize: '0.6rem', color: sc.text, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {customerName}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
        {timeDisplay && (
          <Tooltip title={`${order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Pickup'} time`}>
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 600, color: sc.text, opacity: 0.75 }}>
              {timeDisplay}
            </Typography>
          </Tooltip>
        )}
        <Tooltip title={order.fulfillmentType}>
          <Box sx={{ fontSize: 12, color: sc.text, display: 'flex' }}>
            {FULFILLMENT_ICONS[order.fulfillmentType] || FULFILLMENT_ICONS.PICKUP}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
});

/* ── day cell ──────────────────────────────────────────────── */
const DayCell = React.memo(({ date, orders, currentMonth, onDrop, onDetailClick, filterStatus, filterFulfillment }) => {
  const theme = useTheme();
  const [dragOver, setDragOver] = useState(false);
  const sameMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const dateStr = format(date, 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    let list = orders || [];
    if (filterStatus) list = list.filter(o => o.status === filterStatus);
    if (filterFulfillment) list = list.filter(o => o.fulfillmentType === filterFulfillment);
    return list;
  }, [orders, filterStatus, filterFulfillment]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (payload.orderId) {
        onDrop(payload.orderId, dateStr, payload.orderNumber);
      }
    } catch { /* ignore bad data */ }
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        minHeight: { xs: 80, md: 110 },
        p: 0.5,
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: dragOver
          ? alpha(theme.palette.primary.main, 0.08)
          : !sameMonth
            ? alpha(theme.palette.action.hover, 0.04)
            : 'background.paper',
        transition: 'background-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* date number */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: today ? 800 : sameMonth ? 600 : 400,
            color: today ? 'primary.main' : sameMonth ? 'text.primary' : 'text.disabled',
            width: 22, height: 22, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...(today && { bgcolor: 'primary.main', color: 'white' }),
          }}
        >
          {format(date, 'd')}
        </Typography>
        {filtered.length > 0 && (
          <Chip
            label={filtered.length}
            size="small"
            sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.6 } }}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* order cards */}
      <Box sx={{ flex: 1, overflow: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 1 } }}>
        {filtered.map(order => (
          <OrderCard key={order.id} order={order} onDetailClick={onDetailClick} />
        ))}
      </Box>
    </Box>
  );
});

/* ── unscheduled sidebar ───────────────────────────────────── */
const UnscheduledSidebar = React.memo(({ orders, onDetailClick, filterStatus, filterFulfillment }) => {
  const filtered = useMemo(() => {
    let list = orders;
    if (filterStatus) list = list.filter(o => o.status === filterStatus);
    if (filterFulfillment) list = list.filter(o => o.fulfillmentType === filterFulfillment);
    return list;
  }, [orders, filterStatus, filterFulfillment]);

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: '100%', md: 220 },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          Unscheduled
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''} — drag to calendar
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 0.75 }}>
        {filtered.length === 0 ? (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', textAlign: 'center', mt: 3 }}>
            No unscheduled orders
          </Typography>
        ) : (
          filtered.map(order => (
            <OrderCard key={order.id} order={order} onDetailClick={onDetailClick} />
          ))
        )}
      </Box>
    </Paper>
  );
});

/* ── order detail dialog ───────────────────────────────────── */
const OrderDetailDialog = ({ order, open, onClose }) => {
  if (!order) return null;
  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.NEW;
  const customerName = order.customer
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    : order.guestFirstName
      ? `${order.guestFirstName} ${order.guestLastName || ''}`.trim()
      : 'Guest';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarMonth color="primary" />
        Order {order.orderNumber}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography color="text.secondary" variant="caption">Customer</Typography>
            <Typography fontWeight={600}>{customerName}</Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">Status</Typography>
            <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontWeight: 600 }} />
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">Fulfillment</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {FULFILLMENT_ICONS[order.fulfillmentType]}
              <Typography fontWeight={600}>{order.fulfillmentType}</Typography>
            </Box>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">Total</Typography>
            <Typography fontWeight={600}>${Number(order.totalAmount).toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">Scheduled Date</Typography>
            <Typography fontWeight={600}>
              {order.scheduledDate ? format(parseISO(order.scheduledDate), 'MMM d, yyyy') : 'Not scheduled'}
            </Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">
              {order.fulfillmentType === 'DELIVERY' ? 'Delivery Time' : 'Pickup Time'}
            </Typography>
            <Typography fontWeight={600}>
              {order.timeslot
                ? `${order.timeslot.startTime} – ${order.timeslot.endTime}`
                : order.scheduledSlot || 'Not set'}
            </Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">Payment</Typography>
            <Typography fontWeight={600}>
              {order.paymentMethod?.replace('_', ' ')} {order.isPaid ? '(Paid)' : '(Unpaid)'}
            </Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">Source</Typography>
            <Typography fontWeight={600} sx={{ textTransform: 'uppercase' }}>{order.source}</Typography>
          </Box>
        </Box>

        {order.items && order.items.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Items</Typography>
            {order.items.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                <Typography fontSize="0.8rem">
                  {item.quantity}× {item.product?.name || 'Item'} {item.variant ? `(${item.variant.name})` : ''}
                </Typography>
                <Typography fontSize="0.8rem" fontWeight={600}>${Number(item.totalPrice).toFixed(2)}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {order.productionNotes && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary">Production Notes</Typography>
            <Typography fontSize="0.85rem">{order.productionNotes}</Typography>
          </Box>
        )}

        {order.deliveryAddress && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary">Delivery Address</Typography>
            <Typography fontSize="0.85rem">{order.deliveryAddress}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          size="small"
          href={`/admin/orders/${order.id}`}
          target="_blank"
        >
          Open full detail
        </Button>
        <Button onClick={onClose} variant="contained" size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── main calendar component ───────────────────────────────── */
const AdminDeliveryCalendar = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFulfillment, setFilterFulfillment] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  /* ── fetch orders ── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all active orders (non-completed/cancelled/refunded get priority, but fetch all for calendar)
      const res = await api.get('/orders', {
        params: { limit: 500, sortBy: 'scheduledDate', sortDir: 'asc' },
      });
      setOrders(res.data.data || []);
    } catch (err) {
      showSnackbar('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── reschedule (drag & drop) ── */
  const handleDrop = useCallback(async (orderId, newDateStr, orderNumber) => {
    setRescheduleLoading(true);
    try {
      await api.patch(`/orders/${orderId}/reschedule`, { scheduledDate: newDateStr });

      // Optimistic update
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, scheduledDate: `${newDateStr}T00:00:00.000Z` } : o)
      );

      showSnackbar(`Order ${orderNumber || ''} moved to ${format(new Date(newDateStr), 'MMM d, yyyy')}`, 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to reschedule order', 'error');
      fetchOrders(); // revert on failure
    } finally {
      setRescheduleLoading(false);
    }
  }, [showSnackbar, fetchOrders]);

  /* ── calendar grid data ── */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  /* ── map orders to dates ── */
  const ordersByDate = useMemo(() => {
    const map = {};
    for (const order of orders) {
      if (!order.scheduledDate) continue;
      const key = format(parseISO(order.scheduledDate), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(order);
    }
    return map;
  }, [orders]);

  const unscheduledOrders = useMemo(() =>
    orders.filter(o =>
      !o.scheduledDate &&
      !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)
    ),
  [orders]);

  /* ── summary stats ── */
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const inMonth = orders.filter(o => {
      if (!o.scheduledDate) return false;
      const d = parseISO(o.scheduledDate);
      return d >= monthStart && d <= monthEnd;
    });
    const deliveries = inMonth.filter(o => o.fulfillmentType === 'DELIVERY').length;
    const pickups = inMonth.filter(o => o.fulfillmentType === 'PICKUP').length;
    const revenue = inMonth.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    return { total: inMonth.length, deliveries, pickups, revenue };
  }, [orders, currentMonth]);

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading && orders.length === 0) {
    return (
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* ── header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <CalendarMonth sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box sx={{ flex: 1, minWidth: 150 }}>
          <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: 'secondary.main' }}>
            Delivery Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drag & drop orders to reschedule
          </Typography>
        </Box>

        {/* month nav */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton onClick={() => setCurrentMonth(m => subMonths(m, 1))} size="small"><ChevronLeft /></IconButton>
          <Button
            variant="text"
            onClick={() => setCurrentMonth(new Date())}
            startIcon={<Today />}
            sx={{ fontWeight: 700, fontSize: '1rem', textTransform: 'none', minWidth: 180, justifyContent: 'center' }}
          >
            {format(currentMonth, 'MMMM yyyy')}
          </Button>
          <IconButton onClick={() => setCurrentMonth(m => addMonths(m, 1))} size="small"><ChevronRight /></IconButton>
        </Box>

        {/* filters */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {Object.entries(STATUS_COLORS).map(([key, val]) => (
              <MenuItem key={key} value={key}>{val.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filterFulfillment} label="Type" onChange={e => setFilterFulfillment(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="DELIVERY">Delivery</MenuItem>
            <MenuItem value="PICKUP">Pickup</MenuItem>
            <MenuItem value="WALKIN">Walk-in</MenuItem>
          </Select>
        </FormControl>

        <IconButton onClick={fetchOrders} disabled={loading} size="small">
          {loading ? <CircularProgress size={20} /> : <Refresh />}
        </IconButton>
      </Box>

      {/* ── stats row ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'Scheduled', value: monthStats.total, color: 'primary.main' },
          { label: 'Deliveries', value: monthStats.deliveries, color: '#8e24aa' },
          { label: 'Pickups', value: monthStats.pickups, color: '#00897b' },
          { label: 'Revenue', value: `$${monthStats.revenue.toFixed(0)}`, color: '#388e3c' },
          { label: 'Unscheduled', value: unscheduledOrders.length, color: '#e53935' },
        ].map(stat => (
          <Card
            key={stat.label}
            variant="outlined"
            sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 2 }}
          >
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{stat.label}</Typography>
          </Card>
        ))}
      </Box>

      {rescheduleLoading && (
        <Alert severity="info" sx={{ mb: 1 }} icon={<CircularProgress size={16} />}>
          Rescheduling order…
        </Alert>
      )}

      {/* ── calendar + sidebar ── */}
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* sidebar: unscheduled */}
        <UnscheduledSidebar
          orders={unscheduledOrders}
          onDetailClick={setDetailOrder}
          filterStatus={filterStatus}
          filterFulfillment={filterFulfillment}
        />

        {/* calendar grid */}
        <Paper variant="outlined" sx={{ flex: 1, overflow: 'hidden', borderRadius: 2 }}>
          {/* weekday headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              bgcolor: 'action.hover',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {WEEKDAYS.map(d => (
              <Typography
                key={d}
                sx={{
                  textAlign: 'center',
                  py: 0.75,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {d}
              </Typography>
            ))}
          </Box>

          {/* day cells */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
            }}
          >
            {calendarDays.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              return (
                <DayCell
                  key={key}
                  date={day}
                  orders={ordersByDate[key] || []}
                  currentMonth={currentMonth}
                  onDrop={handleDrop}
                  onDetailClick={setDetailOrder}
                  filterStatus={filterStatus}
                  filterFulfillment={filterFulfillment}
                />
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* ── legend ── */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', mr: 1 }}>STATUS:</Typography>
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <Chip
            key={key}
            label={val.label}
            size="small"
            sx={{
              height: 20, fontSize: '0.6rem', fontWeight: 600,
              bgcolor: val.bg, color: val.text, border: `1px solid ${val.border}`,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        ))}
      </Box>

      {/* ── order detail dialog ── */}
      <OrderDetailDialog
        order={detailOrder}
        open={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
      />
    </Container>
  );
};

export default AdminDeliveryCalendar;
