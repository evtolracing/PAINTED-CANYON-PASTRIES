import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Divider, Avatar, Menu, MenuItem,
  useMediaQuery, useTheme
} from '@mui/material';
import {
  Dashboard, ShoppingBag, Inventory2, Category, CalendarMonth,
  People, LocalOffer, MenuBook, BarChart, Settings, SmartToy,
  Menu as MenuIcon, Logout, ChevronLeft, StorefrontOutlined,
  PointOfSale
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 260;
const API_HOST = process.env.REACT_APP_API_HOST || 'http://localhost:5000';

const menuItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/admin' },
  { label: 'Orders', icon: <ShoppingBag />, path: '/admin/orders' },
  { label: 'Products', icon: <Inventory2 />, path: '/admin/products' },
  { label: 'Categories', icon: <Category />, path: '/admin/categories' },
  { label: 'Inventory', icon: <Inventory2 />, path: '/admin/inventory' },
  { label: 'Scheduling', icon: <CalendarMonth />, path: '/admin/scheduling' },
  { divider: true },
  { label: 'Customers', icon: <People />, path: '/admin/customers' },
  { label: 'Promotions', icon: <LocalOffer />, path: '/admin/promos' },
  { label: 'Knowledge Base', icon: <MenuBook />, path: '/admin/knowledge-base' },
  { divider: true },
  { label: 'Analytics', icon: <BarChart />, path: '/admin/analytics' },
  { label: 'AI Assistant', icon: <SmartToy />, path: '/admin/ai' },
  { label: 'Settings', icon: <Settings />, path: '/admin/settings' },
];

const AdminLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <StorefrontOutlined sx={{ color: 'primary.main', fontSize: 24 }} />
        <Box>
          <Typography sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2, color: 'secondary.main' }}>
            Painted Canyon
          </Typography>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.15em', color: 'primary.main', textTransform: 'uppercase' }}>
            Admin Dashboard
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(false)} sx={{ ml: 'auto' }}>
            <ChevronLeft />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Nav Items */}
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {menuItems.map((item, index) => {
          if (item.divider) return <Divider key={index} sx={{ my: 1 }} />;
          const isActive = location.pathname === item.path ||
            (item.path !== '/admin' && location.pathname.startsWith(item.path));

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: 1.5,
                  ...(isActive && {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                  }),
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isActive ? 'white' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Quick Links */}
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/pos" sx={{ borderRadius: 2, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 36 }}><PointOfSale /></ListItemIcon>
            <ListItemText primary="Open POS" primaryTypographyProps={{ fontSize: '0.85rem' }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/" sx={{ borderRadius: 2, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 36 }}><StorefrontOutlined /></ListItemIcon>
            <ListItemText primary="View Store" primaryTypographyProps={{ fontSize: '0.85rem' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'background.paper' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <Avatar
                src={user?.avatar ? `${API_HOST}${user.avatar}` : undefined}
                sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
            </Box>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/account'); }}>My Account</MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }}>
                <Logout sx={{ mr: 1, fontSize: 18 }} /> Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
