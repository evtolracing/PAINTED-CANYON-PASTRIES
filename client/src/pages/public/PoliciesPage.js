import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Container, Typography, Tabs, Tab, Paper, Divider, Skeleton,
} from '@mui/material';
import {
  LocalShipping, Replay, Warning, PrivacyTip, Accessibility as AccessibilityIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const SECTIONS = [
  { slug: 'delivery', label: 'Delivery Policy', icon: <LocalShipping /> },
  { slug: 'refunds', label: 'Refunds', icon: <Replay /> },
  { slug: 'allergens', label: 'Allergens', icon: <Warning /> },
  { slug: 'privacy', label: 'Privacy Policy', icon: <PrivacyTip /> },
  { slug: 'accessibility', label: 'Accessibility', icon: <AccessibilityIcon /> },
];

const buildPolicyContent = (info) => {
  const address = info?.address ? `${info.address}, ${info.city || ''}, ${info.state || ''} ${info.zip || ''}` : 'our bakery';
  const email = info?.email || 'our email';
  const phone = info?.phone || 'our phone';

  return {
    delivery: {
      title: 'Delivery Policy',
      content: `
**Delivery Area**
We currently deliver within the Joshua Tree and surrounding high desert communities. Check our delivery ZIP codes at checkout.

**Delivery Hours**
Deliveries are available during our open hours. Check our Contact page for current hours.

**Delivery Fees**
Delivery fees vary by distance and order size. Orders over a certain threshold may qualify for free delivery.

**Handling & Packaging**
All items are carefully packaged in temperature-appropriate containers to ensure freshness upon arrival. Cakes are secured in sturdy boxes with non-slip liners.

**Missed Deliveries**
If you are unavailable at the time of delivery, our driver will attempt to leave the order in a safe location. If this is not possible, we will contact you to arrange redelivery (additional fees may apply).
      `,
    },
    refunds: {
      title: 'Refund & Returns Policy',
      content: `
**Our Guarantee**
We take pride in every item we bake. If you're not satisfied with your order, we want to make it right.

**Requesting a Refund**
Please contact us within 24 hours of receiving your order at ${email} or ${phone}. Include your order number and a description of the issue.

**Eligible Refunds**
- Incorrect items received
- Quality issues (damaged, stale, or improperly prepared)
- Missing items from your order

**Non-Refundable**
- Custom orders (cakes, catering) that were made to specification
- Items that were delivered as described but simply not preferred
- Orders picked up more than 1 hour after the scheduled time window

**Resolution Options**
Depending on the issue, we may offer a full refund, store credit, or a replacement item at no charge. We aim to resolve all issues within 2 business days.
      `,
    },
    allergens: {
      title: 'Allergen Information',
      content: `
**Common Allergens**
Our products may contain or come into contact with the following allergens:
- **Wheat/Gluten** — used in most baked goods
- **Dairy** — butter, milk, cream cheese
- **Eggs** — used in most recipes
- **Tree Nuts** — almonds, pecans, walnuts
- **Peanuts** — used in select items
- **Soy** — present in some chocolate and margarine

**Gluten-Free Options**
We offer a dedicated gluten-free product line. While prepared in a separate area with dedicated equipment, our kitchen does process wheat products. Individuals with celiac disease should be aware of the potential for trace cross-contamination.

**Allergen Labeling**
All products on our website and in-store are labeled with allergen information. If you have specific dietary concerns, please don't hesitate to contact us before ordering.

**Custom Dietary Needs**
For custom orders accommodating specific allergies or dietary restrictions, please reach out at least 72 hours in advance.
      `,
    },
    privacy: {
      title: 'Privacy Policy',
      content: `
**Information We Collect**
We collect information you provide directly: name, email, phone number, delivery address, and payment information when you place an order.

**How We Use Your Information**
- Processing and fulfilling your orders
- Communicating about your orders and account
- Sending marketing emails (only with your consent)
- Improving our products and services

**Data Security**
All payment information is processed securely through Stripe and is never stored on our servers. We use industry-standard encryption to protect your personal data.

**Third-Party Sharing**
We do not sell or share your personal information with third parties, except as necessary to fulfill your orders (e.g., delivery services) or comply with legal obligations.

**Your Rights**
You may request access to, correction of, or deletion of your personal data at any time by contacting us at ${email}.

**Cookies**
Our website uses cookies to enhance your browsing experience and remember your cart. You can manage cookie preferences in your browser settings.
      `,
    },
    accessibility: {
      title: 'Accessibility Statement',
      content: `
**Our Commitment**
Painted Canyon Pastries is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.

**Standards**
We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at the AA level.

**Measures Taken**
- Semantic HTML structure throughout the website
- Keyboard navigation support
- Color contrast meeting WCAG AA standards
- Alt text for all meaningful images
- ARIA labels for interactive elements
- Responsive design for all screen sizes
- Screen reader compatibility

**Physical Location**
Our bakery is wheelchair accessible with:
- Ramp entrance
- Accessible restrooms
- Lowered counter section
- Wide aisles

**Feedback**
If you encounter any accessibility barriers on our website, please contact us at ${email}. We welcome your feedback and will work to address any issues promptly.
      `,
    },
  };
};

const PoliciesPage = () => {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [bakeryInfo, setBakeryInfo] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data } = await api.get('/settings/public');
        setBakeryInfo(data.data.bakeryInfo);
      } catch { /* silent */ }
    };
    fetchInfo();
  }, []);

  useEffect(() => {
    if (slug) {
      const idx = SECTIONS.findIndex((s) => s.slug === slug);
      if (idx >= 0) setActiveTab(idx);
    }
  }, [slug]);

  const activeSection = SECTIONS[activeTab];
  const policyContent = buildPolicyContent(bakeryInfo);
  const content = policyContent[activeSection.slug];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #faf7f2 0%, #ebe0cc 100%)',
          py: { xs: 5, md: 8 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>Legal & Policies</Typography>
          <Typography variant="h1" gutterBottom>Policies</Typography>
          <Typography variant="body1" color="text.secondary">
            Transparency matters to us. Here you'll find our key policies.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, idx) => setActiveTab(idx)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              bgcolor: 'sandstone.50',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 56 },
            }}
          >
            {SECTIONS.map((s) => (
              <Tab key={s.slug} icon={s.icon} iconPosition="start" label={s.label} />
            ))}
          </Tabs>
          <Divider />
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <Typography variant="h3" gutterBottom>{content.title}</Typography>
            {content.content.split('\n').map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return <Box key={idx} sx={{ height: 12 }} />;
              if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                return (
                  <Typography key={idx} variant="h6" sx={{ mt: 3, mb: 1 }}>
                    {trimmed.replace(/\*\*/g, '')}
                  </Typography>
                );
              }
              if (trimmed.startsWith('- **')) {
                const parts = trimmed.replace(/^- /, '').split('**').filter(Boolean);
                return (
                  <Typography key={idx} variant="body1" component="li" sx={{ ml: 3, mb: 0.5 }}>
                    <strong>{parts[0]}</strong>{parts.slice(1).join('')}
                  </Typography>
                );
              }
              if (trimmed.startsWith('- ')) {
                return (
                  <Typography key={idx} variant="body1" component="li" sx={{ ml: 3, mb: 0.5 }}>
                    {trimmed.replace(/^- /, '')}
                  </Typography>
                );
              }
              return (
                <Typography key={idx} variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {trimmed}
                </Typography>
              );
            })}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PoliciesPage;
