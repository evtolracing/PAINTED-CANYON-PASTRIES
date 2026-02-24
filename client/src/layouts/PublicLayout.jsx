import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, Typography, Button, IconButton, Badge, Drawer,
  List, ListItem, ListItemButton, ListItemText, Container, Divider, Stack,
  Avatar, Menu, MenuItem, ListItemIcon
} from '@mui/material';
import {
  ShoppingCart, Menu as MenuIcon, Close, Person, StorefrontOutlined,
  Logout, History
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AIAssistantWidget from '../components/AIAssistantWidget';
import api from '../services/api';

const API_HOST = import.meta.env.VITE_API_HOST || 'http://localhost:5000';

const navLinks = [
  { label: 'Shop', path: '/shop' },
  { label: 'About', path: '/about' },
  { label: 'Catering', path: '/catering' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

const PublicLayout = () => {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [bakeryLogo, setBakeryLogo] = useState(null);

  useEffect(() => {
    api.get('/settings/public').then(({ data }) => {
      if (data.data?.bakeryLogo) setBakeryLogo(data.data.bakeryLogo);
    }).catch(() => {});
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Bar */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 0.5 }}>
            {/* Mobile menu button */}
            <IconButton sx={{ display: { md: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box
              component={Link}
              to="/"
              sx={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              {bakeryLogo ? (
                <Box
                  component="img"
                  src={`${API_HOST}${bakeryLogo}`}
                  alt="Logo"
                  sx={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 1 }}
                />
              ) : (
                <StorefrontOutlined sx={{ color: 'primary.main', fontSize: 28 }} />
              )}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    color: 'secondary.main',
                    fontSize: '1.1rem',
                    lineHeight: 1.2,
                    letterSpacing: '0.02em',
                  }}
                >
                  PAINTED CANYON
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    color: 'primary.main',
                    textTransform: 'uppercase',
                  }}
                >
                  PASTRIES
                </Typography>
              </Box>
            </Box>

            {/* Desktop Nav */}
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {navLinks.map((link) => (
                <Button
                  key={link.path}
                  component={Link}
                  to={link.path}
                  sx={{
                    color: 'text.primary',
                    fontWeight: 500,
                    '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>

            {/* Right Actions */}
            <Stack direction="row" spacing={1} alignItems="center">
              {isAdmin && (
                <Button
                  component={Link}
                  to="/admin"
                  size="small"
                  variant="outlined"
                  sx={{ display: { xs: 'none', sm: 'flex' }, fontSize: '0.75rem' }}
                >
                  Admin
                </Button>
              )}
              {user ? (
                <>
                  <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} size="small">
                    {user.avatar ? (
                      <Avatar
                        src={`${API_HOST}${user.avatar}`}
                        sx={{ width: 28, height: 28 }}
                      />
                    ) : (
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </Avatar>
                    )}
                  </IconButton>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={() => setUserMenuAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    PaperProps={{ sx: { minWidth: 180, mt: 1 } }}
                  >
                    <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/account'); }}>
                      <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                      My Account
                    </MenuItem>
                    <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/orders'); }}>
                      <ListItemIcon><History fontSize="small" /></ListItemIcon>
                      Order History
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={() => { setUserMenuAnchor(null); logout(); navigate('/'); }}>
                      <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                      Sign Out
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button component={Link} to="/login" size="small" sx={{ color: 'text.primary' }}>
                  Sign In
                </Button>
              )}
              <IconButton component={Link} to="/cart">
                <Badge badgeContent={itemCount} color="primary">
                  <ShoppingCart />
                </Badge>
              </IconButton>
              <Button
                component={Link}
                to="/shop"
                variant="contained"
                size="small"
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                Order Now
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 280, pt: 2 }}>
          <Box sx={{ px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700 }}>
              Menu
            </Typography>
            <IconButton onClick={() => setMobileOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <List>
            {navLinks.map((link) => (
              <ListItem key={link.path} disablePadding>
                <ListItemButton component={Link} to={link.path} onClick={() => setMobileOpen(false)}>
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider sx={{ my: 1 }} />
            {user ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton component={Link} to="/account" onClick={() => setMobileOpen(false)}>
                    <ListItemText primary="My Account" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component={Link} to="/orders" onClick={() => setMobileOpen(false)}>
                    <ListItemText primary="Order History" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => { logout(); setMobileOpen(false); navigate('/'); }}>
                    <ListItemText primary="Sign Out" />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/login" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Sign In" />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      {/* AI Assistant Widget */}
      <AIAssistantWidget context="customer" />

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: 'secondary.main',
          color: 'white',
          mt: 'auto',
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' }, gap: 4 }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', mb: 1 }}>
                Painted Canyon Pastries
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', maxWidth: 280 }}>
                Artisan baked goods crafted with love in Joshua Tree, California. Inspired by the desert, made for your table.
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.light', display: 'block', mb: 1 }}>Shop</Typography>
              {['Cookies', 'Croissants', 'Cakes', 'Seasonal'].map((cat) => (
                <Typography
                  key={cat}
                  component={Link}
                  to={`/shop/${cat.toLowerCase()}`}
                  variant="body2"
                  sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', mb: 0.5, '&:hover': { color: 'primary.light' } }}
                >
                  {cat}
                </Typography>
              ))}
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.light', display: 'block', mb: 1 }}>Info</Typography>
              {[
                { label: 'About', path: '/about' },
                { label: 'FAQ', path: '/faq' },
                { label: 'Catering', path: '/catering' },
                { label: 'Contact', path: '/contact' },
              ].map((link) => (
                <Typography
                  key={link.path}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', mb: 0.5, '&:hover': { color: 'primary.light' } }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.light', display: 'block', mb: 1 }}>Policies</Typography>
              {[
                { label: 'Delivery Policy', path: '/policies/delivery' },
                { label: 'Refund Policy', path: '/policies/refunds' },
                { label: 'Privacy Policy', path: '/policies/privacy' },
                { label: 'Accessibility', path: '/policies/accessibility' },
              ].map((link) => (
                <Typography
                  key={link.path}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', mb: 0.5, '&:hover': { color: 'primary.light' } }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 4 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            © {new Date().getFullYear()} Painted Canyon Pastries · Joshua Tree, CA · All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicLayout;
