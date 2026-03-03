import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Grid, Card, CardMedia, CardContent,
  CardActions, Chip, Stack, TextField, IconButton, Rating, Skeleton, Paper
} from '@mui/material';
import {
  ArrowForward, LocalShipping, StorefrontOutlined, Schedule, Star,
  Email as EmailIcon, ChevronLeft, ChevronRight
} from '@mui/icons-material';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useSnackbar } from '../../context/SnackbarContext';
import { getImageUrl } from '../../utils/imageUrl';

/* ── Horizontal auto-scroll strip (reused for Best Sellers & Seasonal) ── */
const CARD_WIDTH = 260;  // px per card
const CARD_GAP = 16;     // px gap

const BestSellersStrip = ({ products, loading, addItem, showSnackbar, fallbackEmoji = '🧁' }) => {
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  // Slow auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || products.length <= 0) return;

    // Only auto-scroll if content overflows
    const needsScroll = el.scrollWidth > el.clientWidth;
    if (!needsScroll) return;

    let raf;
    const speed = 0.5; // px per frame (~30px/s at 60fps)

    const step = () => {
      if (!isPaused && el) {
        el.scrollLeft += speed;
        // Loop back to start when reaching the end
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loading, products, isPaused]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, px: { xs: 2, md: 4 }, overflow: 'hidden' }}>
        {Array(5).fill(null).map((_, i) => (
          <Card key={i} sx={{ minWidth: CARD_WIDTH, flex: '0 0 auto' }}>
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
              <Skeleton width="60%" />
              <Skeleton width="80%" />
              <Skeleton width="30%" />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (products.length === 0) return null;

  return (
    <Box
      ref={scrollRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      sx={{
        display: 'flex',
        gap: `${CARD_GAP}px`,
        px: { xs: 2, md: 4 },
        overflowX: 'auto',
        scrollBehavior: 'smooth',
        // Hide scrollbar but keep scrollable
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {products.map((product) => (
        <Card
          key={product.id}
          component={Link}
          to={`/product/${product.slug}`}
          sx={{
            minWidth: { xs: 200, sm: CARD_WIDTH },
            maxWidth: { xs: 200, sm: CARD_WIDTH },
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              sx={{
                height: { xs: 150, sm: 200 },
                bgcolor: 'sandstone.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
              }}
            >
              {product.images?.[0]?.url ? (
                <Box
                  component="img"
                  src={getImageUrl(product.images[0].url)}
                  alt={product.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography variant="h3" sx={{ color: 'sandstone.300' }}>{fallbackEmoji}</Typography>
              )}
            </CardMedia>
            {product.badges?.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, left: 8 }}>
                {product.badges.map((badge) => (
                  <Chip
                    key={badge}
                    label={badge}
                    size="small"
                    color={badge === 'Best Seller' ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, fontSize: '0.6rem' }}
                  />
                ))}
              </Stack>
            )}
          </Box>
          <CardContent sx={{ flexGrow: 1, px: 1.5, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {product.category?.name}
            </Typography>
            <Typography variant="h6" sx={{ fontSize: '0.9rem', mb: 0.25 }} noWrap>
              {product.name}
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
              ${Number(product.basePrice).toFixed(2)}
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 1.5, pb: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addItem(product);
                showSnackbar(`${product.name} added to cart!`);
              }}
            >
              Add to Cart
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

const HomePage = () => {
  const [bestSellers, setBestSellers] = useState([]);
  const [seasonal, setSeasonal] = useState([]);
  const [fromBakery, setFromBakery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();

  // Hero slideshow
  const [slideImages, setSlideImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchHomepage = async () => {
      try {
        const { data } = await api.get('/settings/homepage');
        const bs = data.data?.bestSellers || [];
        const sn = data.data?.seasonal || [];
        const fb = data.data?.fromOurBakery || [];
        setBestSellers(bs);
        setSeasonal(sn);
        setFromBakery(fb);

        // Build slideshow: featured/bestSellers first, then seasonal, then rest
        // Deduplicate by id and only include products with images
        const seen = new Set();
        const slides = [];
        for (const p of [...bs, ...sn, ...fb]) {
          const imgUrl = p.images?.[0]?.url || p.imageUrl;
          if (imgUrl && !seen.has(p.id)) {
            seen.add(p.id);
            slides.push({ id: p.id, name: p.name, slug: p.slug, image: imgUrl });
          }
        }
        // If curated list is small, fetch more products
        if (slides.length < 4) {
          try {
            const { data: allData } = await api.get('/products', { params: { limit: 20 } });
            const prods = allData.data || allData || [];
            for (const p of prods) {
              const imgUrl = p.images?.[0]?.url || p.imageUrl;
              if (imgUrl && !seen.has(p.id)) {
                seen.add(p.id);
                slides.push({ id: p.id, name: p.name, slug: p.slug, image: imgUrl });
              }
            }
          } catch { /* ok */ }
        }
        setSlideImages(slides);
      } catch {
        setBestSellers([]);
        setSeasonal([]);
        setFromBakery([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHomepage();
  }, []);

  // Auto-advance hero slideshow
  useEffect(() => {
    if (slideImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slideImages.length]);

  const goToSlide = useCallback((dir) => {
    setCurrentSlide((prev) => (prev + dir + slideImages.length) % slideImages.length);
  }, [slideImages.length]);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    try {
      await api.post('/newsletter', { email });
      showSnackbar('Welcome to the Painted Canyon family! 🌵', 'success');
      setEmail('');
    } catch {
      showSnackbar('Thanks for subscribing!', 'success');
      setEmail('');
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 'auto', md: '85vh' },
          display: 'flex',
          alignItems: 'center',
          background: (theme) => `linear-gradient(135deg, ${theme.palette.sandstone[50]} 0%, ${theme.palette.sandstone[100]} 50%, ${theme.palette.sandstone[200]} 100%)`,
          overflow: 'hidden',
          py: { xs: 4, md: 0 },
        }}
      >
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,149,106,0.1) 0%, transparent 70%)',
          }}
        />

        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="overline"
                sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' }, mb: { xs: 1, md: 2 }, display: 'block', letterSpacing: '0.15em' }}
              >
                Joshua Tree, California
              </Typography>
              <Typography variant="h1" sx={{ mb: { xs: 2, md: 3 }, fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' } }}>
                Artisan pastries crafted with
                <Box component="span" sx={{ color: 'primary.main', display: 'block' }}>
                  desert soul
                </Box>
              </Typography>
              <Typography variant="body1" sx={{ mb: { xs: 3, md: 4 }, maxWidth: 480, fontSize: { xs: '0.95rem', md: '1.1rem' }, color: 'text.secondary' }}>
                Handmade cookies, croissants, cakes, and seasonal creations baked fresh daily.
                Order for pickup or local delivery.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  component={Link}
                  to="/shop"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
                >
                  Order Now
                </Button>
                <Button
                  component={Link}
                  to="/catering"
                  variant="outlined"
                  size="large"
                  sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
                >
                  Catering Menu
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 280, sm: 380, md: 500 },
                  borderRadius: { xs: 3, md: 4 },
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(139,101,68,0.3)',
                  background: 'linear-gradient(160deg, #d4a87e 0%, #c4956a 30%, #a67c52 70%, #8b6544 100%)',
                }}
              >
                {slideImages.length > 0 ? (
                  <>
                    {/* Slides */}
                    {slideImages.map((slide, i) => (
                      <Box
                        key={slide.id}
                        component={Link}
                        to={`/product/${slide.slug}`}
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          opacity: i === currentSlide ? 1 : 0,
                          transition: 'opacity 0.8s ease-in-out',
                          textDecoration: 'none',
                        }}
                      >
                        <Box
                          component="img"
                          src={getImageUrl(slide.image)}
                          alt={slide.name}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {/* Product name overlay */}
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 3,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                          }}
                        >
                          <Typography
                            variant="h5"
                            sx={{
                              color: 'white',
                              fontFamily: '"Playfair Display", serif',
                              fontWeight: 600,
                              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          >
                            {slide.name}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {/* Arrow buttons */}
                    {slideImages.length > 1 && (
                      <>
                        <IconButton
                          onClick={() => goToSlide(-1)}
                          sx={{
                            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                            bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                            zIndex: 2,
                          }}
                          size="small"
                        >
                          <ChevronLeft />
                        </IconButton>
                        <IconButton
                          onClick={() => goToSlide(1)}
                          sx={{
                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                            bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                            zIndex: 2,
                          }}
                          size="small"
                        >
                          <ChevronRight />
                        </IconButton>
                      </>
                    )}

                    {/* Dot indicators */}
                    {slideImages.length > 1 && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
                      >
                        {slideImages.map((_, i) => (
                          <Box
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            sx={{
                              width: i === currentSlide ? 24 : 8,
                              height: 8,
                              borderRadius: 4,
                              bgcolor: i === currentSlide ? 'white' : 'rgba(255,255,255,0.5)',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </>
                ) : (
                  /* Fallback if no product images available */
                  <>
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.15,
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)',
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography
                        sx={{
                          fontFamily: '"Playfair Display", serif',
                          fontSize: '2.5rem',
                          color: 'white',
                          textAlign: 'center',
                          fontWeight: 600,
                          textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                      >
                        🧁<br />Fresh Daily
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 10 } }}>
        <Typography variant="h2" align="center" sx={{ mb: 1 }}>
          How It Works
        </Typography>
        <Typography variant="body1" align="center" sx={{ color: 'text.secondary', mb: { xs: 3, md: 6 }, maxWidth: 500, mx: 'auto' }}>
          Fresh-baked to order with convenient pickup and local delivery options.
        </Typography>
        <Grid container spacing={4}>
          {[
            { icon: <StorefrontOutlined sx={{ fontSize: 40 }} />, title: 'Browse & Order', desc: 'Explore our menu of handcrafted pastries, cookies, cakes, and seasonal specials.' },
            { icon: <Schedule sx={{ fontSize: 40 }} />, title: 'Choose Your Time', desc: 'Pick a convenient pickup window or delivery slot that works best for you.' },
            { icon: <LocalShipping sx={{ fontSize: 40 }} />, title: 'Pick Up or Deliver', desc: 'Grab your order from our Joshua Tree bakery, or we\'ll bring it to your door.' },
          ].map((step, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                }}
              >
                <Box sx={{ color: 'primary.main', mb: 2 }}>{step.icon}</Box>
                <Typography variant="h5" sx={{ mb: 1 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary">{step.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Best Sellers */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 5, md: 10 }, overflow: 'hidden' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="overline">Customer Favorites</Typography>
              <Typography variant="h2">Best Sellers</Typography>
            </Box>
            <Button component={Link} to="/shop" endIcon={<ArrowForward />}>
              View All
            </Button>
          </Box>
        </Container>

        {/* Scrolling strip */}
        <BestSellersStrip
          products={bestSellers}
          loading={loading}
          addItem={addItem}
          showSnackbar={showSnackbar}
        />
      </Box>

      {/* Seasonal Collection */}
      <Box sx={{ py: { xs: 5, md: 10 }, overflow: 'hidden' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="overline">Limited Time</Typography>
              <Typography variant="h2">Seasonal Collection</Typography>
            </Box>
            <Button component={Link} to="/shop" endIcon={<ArrowForward />}>
              Shop Seasonal
            </Button>
          </Box>
        </Container>

        {seasonal.length > 0 ? (
          <BestSellersStrip
            products={seasonal}
            loading={loading}
            addItem={addItem}
            showSnackbar={showSnackbar}
            fallbackEmoji="🍂"
          />
        ) : (
          <Container maxWidth="lg">
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    height: 400,
                    borderRadius: 4,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.sandstone[200]} 0%, ${theme.palette.sandstone[300]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4rem',
                  }}
                >
                  🍂
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 420 }}>
                  Discover our rotating selection of seasonal pastries inspired by the changing desert landscape. 
                  From prickly pear tarts to Joshua Tree honey croissants — available while they last.
                </Typography>
                <Button
                  component={Link}
                  to="/shop"
                  variant="contained"
                  endIcon={<ArrowForward />}
                >
                  Shop Seasonal
                </Button>
              </Grid>
            </Grid>
          </Container>
        )}
      </Box>

      {/* Testimonials */}
      <Box sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#2a1f1a' : 'secondary.main', color: 'white', py: { xs: 5, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h2" align="center" sx={{ color: 'white', mb: { xs: 3, md: 6 } }}>
            What Locals Say
          </Typography>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {testimonials.map((t, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    height: '100%',
                  }}
                >
                  <Rating value={5} readOnly size="small" sx={{ mb: 2, '& .MuiRating-icon': { color: 'primary.main' } }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, fontStyle: 'italic' }}>
                    "{t.text}"
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: 'primary.light' }}>
                    — {t.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* From Our Bakery */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 10 } }}>
        <Typography variant="h2" align="center" sx={{ mb: 1 }}>From Our Bakery</Typography>
        <Typography variant="body1" align="center" sx={{ color: 'text.secondary', mb: { xs: 2, md: 4 } }}>
          @paintedcanyonpastries
        </Typography>
        <Grid container spacing={2}>
          {fromBakery.length > 0 ? (
            fromBakery.slice(0, 6).map((product) => {
              const imgUrl = product.images?.[0]?.url ? getImageUrl(product.images[0].url) : null;
              return (
                <Grid item xs={6} sm={4} md={2} key={product.id}>
                  <Box
                    component={Link}
                    to={`/product/${product.slug}`}
                    sx={{
                      display: 'block',
                      aspectRatio: '1',
                      borderRadius: 3,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.3s',
                      '&:hover': { transform: 'scale(1.05)' },
                      position: 'relative',
                    }}
                  >
                    {imgUrl ? (
                      <Box
                        component="img"
                        src={imgUrl}
                        alt={product.name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          background: (theme) => `linear-gradient(135deg, ${theme.palette.sandstone[200]} 0%, ${theme.palette.sandstone[300]} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                        }}
                      >
                        🧁
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        color: 'white',
                        p: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {product.name}
                    </Box>
                  </Box>
                </Grid>
              );
            })
          ) : (
            [...Array(6)].map((_, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Box
                  sx={{
                    aspectRatio: '1',
                    borderRadius: 3,
                    background: (theme) => `linear-gradient(${135 + i * 30}deg, ${theme.palette.sandstone[200]} 0%, ${theme.palette.sandstone[400]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    transition: 'transform 0.3s',
                    '&:hover': { transform: 'scale(1.05)' },
                  }}
                >
                  {['🍪', '🥐', '🎂', '🧁', '🥧', '🍰'][i]}
                </Box>
              </Grid>
            ))
          )}
        </Grid>
      </Container>

      {/* Newsletter */}
      <Box
        sx={{
          background: (theme) => `linear-gradient(135deg, ${theme.palette.sandstone[100]} 0%, ${theme.palette.sandstone[200]} 100%)`,
          py: { xs: 5, md: 8 },
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 1 }}>Stay in the Loop</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
              Be the first to know about new flavors, seasonal specials, and exclusive offers.
            </Typography>
            <Box component="form" onSubmit={handleNewsletter}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                <TextField
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="small"
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    flex: 1,
                    maxWidth: 320,
                  }}
                />
                <Button type="submit" variant="contained" startIcon={<EmailIcon />}>
                  Subscribe
                </Button>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

// Testimonials data
const testimonials = [
  { name: 'Sarah K., Yucca Valley', text: 'The chocolate croissants are the best I\'ve had outside of Paris. Fresh every morning and absolutely perfect.' },
  { name: 'Mike R., Joshua Tree', text: 'Ordered a birthday cake for my daughter — it was stunning AND delicious. The whole party was raving about it!' },
  { name: 'Jenny L., Twentynine Palms', text: 'Love the gluten-free options! Finally a bakery that makes GF cookies that actually taste amazing.' },
];

export default HomePage;
