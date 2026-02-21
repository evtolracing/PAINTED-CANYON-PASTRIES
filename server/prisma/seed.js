const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌵 Seeding Painted Canyon Pastries database...\n');

  // ─── ADMIN USER ─────────────────────────────────────
  console.log('👤 Creating admin user...');
  const adminHash = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@paintedcanyonpastries.com' },
    update: {},
    create: {
      email: 'admin@paintedcanyonpastries.com',
      passwordHash: adminHash,
      firstName: 'Canyon',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      pin: '1234',
      emailVerified: true,
    },
  });

  const bakerHash = await bcrypt.hash('baker123!', 12);
  const baker = await prisma.user.upsert({
    where: { email: 'baker@paintedcanyonpastries.com' },
    update: {},
    create: {
      email: 'baker@paintedcanyonpastries.com',
      passwordHash: bakerHash,
      firstName: 'Sierra',
      lastName: 'Baker',
      role: 'BAKER',
      pin: '5678',
      emailVerified: true,
    },
  });

  const cashierHash = await bcrypt.hash('cashier123!', 12);
  await prisma.user.upsert({
    where: { email: 'cashier@paintedcanyonpastries.com' },
    update: {},
    create: {
      email: 'cashier@paintedcanyonpastries.com',
      passwordHash: cashierHash,
      firstName: 'Mesa',
      lastName: 'Cashier',
      role: 'CASHIER',
      pin: '9012',
      emailVerified: true,
    },
  });

  // Demo customer
  const customerHash = await bcrypt.hash('customer123!', 12);
  const customerUser = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      passwordHash: customerHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });

  await prisma.customer.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      userId: customerUser.id,
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '760-555-0101',
      tags: ['VIP'],
    },
  });

  // ─── ALLERGEN TAGS ──────────────────────────────────
  console.log('⚠️  Creating allergen tags...');
  const allergens = ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Peanuts', 'Tree Nuts', 'Wheat', 'Sesame'];
  const allergenRecords = {};
  for (const name of allergens) {
    const a = await prisma.allergenTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    allergenRecords[name] = a;
  }

  // ─── CATEGORIES ─────────────────────────────────────
  console.log('📂 Creating categories...');
  const categoryData = [
    { name: 'Cookies', slug: 'cookies', description: 'Handcrafted cookies baked fresh daily', sortOrder: 1 },
    { name: 'Croissants', slug: 'croissants', description: 'Buttery, flaky, and golden', sortOrder: 2 },
    { name: 'Cakes', slug: 'cakes', description: 'Custom cakes for every occasion', sortOrder: 3 },
    { name: 'Cupcakes', slug: 'cupcakes', description: 'Mini celebrations in every bite', sortOrder: 4 },
    { name: 'Bars', slug: 'bars', description: 'Decadent bars and brownies', sortOrder: 5 },
    { name: 'Gluten-Free', slug: 'gluten-free', description: 'Delicious options for gluten-free diets', sortOrder: 6 },
    { name: 'Seasonal', slug: 'seasonal', description: 'Limited-time desert-inspired creations', sortOrder: 7 },
  ];

  const categories = {};
  for (const cat of categoryData) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = c;
  }

  // ─── PRODUCTS ───────────────────────────────────────
  console.log('🧁 Creating products...');
  const productData = [
    // Cookies
    {
      categorySlug: 'cookies',
      name: 'Desert Sunset Cookie',
      slug: 'desert-sunset-cookie',
      shortDescription: 'Brown butter, sea salt, caramel swirl',
      description: 'Our signature cookie inspired by desert sunsets. Made with browned butter for deep, nutty flavor, swirled with house-made caramel and finished with flaky Maldon sea salt. Crispy edges, chewy center.',
      basePrice: 4.50,
      badges: ['Best Seller'],
      isFeatured: true,
      prepTimeMinutes: 20,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
      variants: [
        { name: 'Single', type: 'pack', price: 4.50 },
        { name: '6-Pack', type: 'pack', price: 24.00 },
        { name: '12-Pack', type: 'pack', price: 45.00 },
      ],
    },
    {
      categorySlug: 'cookies',
      name: 'Prickly Pear Shortbread',
      slug: 'prickly-pear-shortbread',
      shortDescription: 'Vibrant desert fruit in a buttery cookie',
      description: 'Delicate, crumbly shortbread infused with local prickly pear cactus juice. A beautiful natural pink hue with subtle, sweet-tart flavor. Dusted with powdered sugar.',
      basePrice: 5.00,
      badges: ['Seasonal'],
      isFeatured: true,
      prepTimeMinutes: 25,
      allergenIds: ['Gluten', 'Dairy'],
      variants: [
        { name: 'Single', type: 'pack', price: 5.00 },
        { name: '6-Pack', type: 'pack', price: 27.00 },
      ],
    },
    {
      categorySlug: 'cookies',
      name: 'Joshua Tree Oatmeal Raisin',
      slug: 'joshua-tree-oatmeal-raisin',
      shortDescription: 'Classic oatmeal with golden raisins & cinnamon',
      description: 'Hearty, chewy oatmeal cookies studded with plump golden raisins. Warmly spiced with Ceylon cinnamon and a touch of nutmeg. Comfort in every bite.',
      basePrice: 4.00,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 18,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
    },
    {
      categorySlug: 'cookies',
      name: 'Double Chocolate Canyon',
      slug: 'double-chocolate-canyon',
      shortDescription: 'Rich cocoa dough with dark chocolate chunks',
      description: 'For the chocolate lover — deep, fudgy cookie dough loaded with Valrhona dark chocolate chunks. Slightly underbaked for maximum gooeyness.',
      basePrice: 5.00,
      badges: ['Best Seller'],
      isFeatured: true,
      prepTimeMinutes: 18,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Soy'],
    },
    // Croissants
    {
      categorySlug: 'croissants',
      name: 'Classic Butter Croissant',
      slug: 'classic-butter-croissant',
      shortDescription: 'Layers of golden, laminated perfection',
      description: 'Our traditional French-style croissant made with European-style butter. 72-hour cold fermentation for maximum flavor and flakiness. 81 layers of hand-laminated dough.',
      basePrice: 5.50,
      badges: ['Best Seller'],
      isFeatured: true,
      prepTimeMinutes: 30,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
    },
    {
      categorySlug: 'croissants',
      name: 'Almond Croissant',
      slug: 'almond-croissant',
      shortDescription: 'Filled with house-made almond cream',
      description: 'Our butter croissant split and filled with rich frangipane (almond cream), topped with sliced almonds and a generous dusting of powdered sugar. Twice-baked for extra crispness.',
      basePrice: 6.50,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 35,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Tree Nuts'],
    },
    {
      categorySlug: 'croissants',
      name: 'Ham & Gruyère Croissant',
      slug: 'ham-gruyere-croissant',
      shortDescription: 'Savory with smoky ham and aged cheese',
      description: 'Savory croissant filled with smoked Black Forest ham and nutty aged Gruyère cheese. Brushed with Dijon mustard butter. Perfect for brunch.',
      basePrice: 7.50,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 30,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
    },
    // Cakes
    {
      categorySlug: 'cakes',
      name: 'Canyon Carrot Cake',
      slug: 'canyon-carrot-cake',
      shortDescription: 'Three layers with cream cheese frosting',
      description: 'Moist, spiced carrot cake with walnuts, golden raisins, and crushed pineapple. Three layers of pure comfort frosted with our tangy cream cheese buttercream. Finished with toasted coconut and candied carrots.',
      basePrice: 42.00,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 120,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Tree Nuts'],
      variants: [
        { name: '6-inch (6-8 servings)', type: 'size', price: 42.00 },
        { name: '8-inch (10-12 servings)', type: 'size', price: 56.00 },
        { name: '10-inch (16-20 servings)', type: 'size', price: 72.00 },
      ],
    },
    {
      categorySlug: 'cakes',
      name: 'Chocolate Lava Cake',
      slug: 'chocolate-lava-cake',
      shortDescription: 'Rich chocolate with molten center',
      description: 'Decadent individual chocolate cakes with a melting Valrhona chocolate center. Served with fresh whipped cream and seasonal berries. Best served warm.',
      basePrice: 12.00,
      badges: ['Limited'],
      isFeatured: false,
      prepTimeMinutes: 45,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Soy'],
    },
    {
      categorySlug: 'cakes',
      name: 'Lemon Olive Oil Cake',
      slug: 'lemon-olive-oil-cake',
      shortDescription: 'Tender, fragrant, Mediterranean-inspired',
      description: 'Luxuriously moist cake made with California extra-virgin olive oil and fresh Meyer lemons. Glazed with lemon icing and topped with edible flowers. Light, elegant, unforgettable.',
      basePrice: 38.00,
      badges: [],
      isFeatured: true,
      prepTimeMinutes: 90,
      allergenIds: ['Gluten', 'Eggs'],
      variants: [
        { name: '6-inch', type: 'size', price: 38.00 },
        { name: '8-inch', type: 'size', price: 52.00 },
      ],
    },
    // Cupcakes
    {
      categorySlug: 'cupcakes',
      name: 'Prickly Pear Cupcake',
      slug: 'prickly-pear-cupcake',
      shortDescription: 'Desert fruit cupcake with cream cheese swirl',
      description: 'Light vanilla cupcake infused with prickly pear juice, topped with tangy cream cheese frosting tinted naturally pink. Decorated with edible flowers.',
      basePrice: 5.00,
      badges: ['Seasonal'],
      isFeatured: true,
      prepTimeMinutes: 35,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
      variants: [
        { name: 'Single', type: 'pack', price: 5.00 },
        { name: '6-Pack', type: 'pack', price: 27.00 },
        { name: '12-Pack', type: 'pack', price: 50.00 },
      ],
    },
    {
      categorySlug: 'cupcakes',
      name: 'Salted Caramel Cupcake',
      slug: 'salted-caramel-cupcake',
      shortDescription: 'Brown sugar cake with caramel buttercream',
      description: 'Rich brown sugar cake topped with silky salted caramel buttercream. Drizzled with extra caramel sauce and a pinch of fleur de sel.',
      basePrice: 5.00,
      badges: ['Best Seller'],
      isFeatured: false,
      prepTimeMinutes: 30,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
    },
    {
      categorySlug: 'cupcakes',
      name: 'Red Velvet Cupcake',
      slug: 'red-velvet-cupcake',
      shortDescription: 'Classic with whipped cream cheese frosting',
      description: 'A timeless favorite — moist, tender red velvet cake with a subtle cocoa flavor, crowned with billowy whipped cream cheese frosting.',
      basePrice: 5.00,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 30,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
    },
    // Bars
    {
      categorySlug: 'bars',
      name: 'Sandstone Blondie',
      slug: 'sandstone-blondie',
      shortDescription: 'Chewy vanilla blondie with white chocolate',
      description: 'Dense, buttery blondie with brown sugar depth, studded with white chocolate chips and toasted macadamia nuts. Named for its golden sandstone color.',
      basePrice: 5.50,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 25,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Tree Nuts'],
    },
    {
      categorySlug: 'bars',
      name: 'Campfire S\'mores Bar',
      slug: 'campfire-smores-bar',
      shortDescription: 'Graham, chocolate, toasted marshmallow layers',
      description: 'Graham cracker crust topped with rich chocolate ganache and a pillowy layer of house-made marshmallow, torched to golden perfection. Desert campfire vibes.',
      basePrice: 6.00,
      badges: ['Best Seller'],
      isFeatured: true,
      prepTimeMinutes: 40,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
    },
    {
      categorySlug: 'bars',
      name: 'Pecan Pie Bar',
      slug: 'pecan-pie-bar',
      shortDescription: 'Buttery shortbread with pecan pie filling',
      description: 'A shortbread base topped with gooey pecan pie filling. All the holiday flavor, any time of year. Made with local pecans and real vanilla.',
      basePrice: 5.50,
      badges: [],
      isFeatured: false,
      prepTimeMinutes: 35,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Tree Nuts'],
    },
    // Gluten-free
    {
      categorySlug: 'gluten-free',
      name: 'GF Chocolate Brownie',
      slug: 'gf-chocolate-brownie',
      shortDescription: 'Fudgy, rich, and naturally gluten-free',
      description: 'Our signature brownie made with almond flour — incredibly fudgy and rich. No compromise on flavor. Made in a dedicated gluten-free prep area.',
      basePrice: 6.00,
      badges: ['Gluten-Free'],
      isFeatured: true,
      prepTimeMinutes: 25,
      allergenIds: ['Dairy', 'Eggs', 'Tree Nuts'],
      nutritionNotes: 'Made with almond flour. Prepared in a dedicated gluten-free area, though our facility does process wheat.',
    },
    {
      categorySlug: 'gluten-free',
      name: 'GF Lemon Poppy Seed Muffin',
      slug: 'gf-lemon-poppy-seed-muffin',
      shortDescription: 'Bright, zesty, and wonderfully moist',
      description: 'Light and tender muffin made with a blend of rice and almond flours. Bright lemon zest and crunchy poppy seeds, finished with a lemon glaze.',
      basePrice: 5.50,
      badges: ['Gluten-Free'],
      isFeatured: false,
      prepTimeMinutes: 25,
      allergenIds: ['Dairy', 'Eggs', 'Tree Nuts'],
      nutritionNotes: 'Gluten-free. Contains tree nuts (almond flour). Prepared in a facility that handles wheat products.',
    },
    // Seasonal
    {
      categorySlug: 'seasonal',
      name: 'Joshua Tree Honey Croissant',
      slug: 'joshua-tree-honey-croissant',
      shortDescription: 'Local wildflower honey & lavender butter',
      description: 'Our classic croissant glazed with local Joshua Tree wildflower honey and served with house-made lavender compound butter. A true taste of the desert.',
      basePrice: 7.00,
      badges: ['Seasonal', 'Limited'],
      isFeatured: true,
      prepTimeMinutes: 35,
      allergenIds: ['Gluten', 'Dairy', 'Eggs'],
      seasonalStart: new Date('2026-02-01'),
      seasonalEnd: new Date('2026-04-30'),
    },
    {
      categorySlug: 'seasonal',
      name: 'Desert Rose Cake',
      slug: 'desert-rose-cake',
      shortDescription: 'Rosewater & pistachio celebration cake',
      description: 'An enchanting celebration cake scented with rosewater, layered with pistachio cream, and decorated with edible rose petals and candied pistachios. Inspired by desert wildflower season.',
      basePrice: 58.00,
      badges: ['Seasonal'],
      isFeatured: false,
      prepTimeMinutes: 150,
      allergenIds: ['Gluten', 'Dairy', 'Eggs', 'Tree Nuts'],
      seasonalStart: new Date('2026-03-01'),
      seasonalEnd: new Date('2026-05-31'),
      variants: [
        { name: '6-inch', type: 'size', price: 58.00 },
        { name: '8-inch', type: 'size', price: 78.00 },
      ],
    },
  ];

  // Global add-ons
  const globalAddons = [
    { name: 'Gift Note', price: 0.00, isGlobal: true },
    { name: 'Birthday Candles (set of 12)', price: 2.00, isGlobal: true },
    { name: 'Premium Gift Box', price: 5.00, isGlobal: true },
    { name: 'Ribbon & Bow Wrap', price: 3.00, isGlobal: true },
  ];

  for (const addon of globalAddons) {
    await prisma.productAddon.upsert({
      where: { id: addon.name.replace(/\s+/g, '-').toLowerCase() },
      update: {},
      create: addon,
    });
  }

  for (const p of productData) {
    const category = categories[p.categorySlug];
    const { categorySlug, allergenIds, variants, nutritionNotes, ...productFields } = p;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...productFields,
        categoryId: category.id,
        nutritionNotes: nutritionNotes || null,
      },
    });

    // Add allergen tags
    if (allergenIds) {
      for (const allergenName of allergenIds) {
        const allergen = allergenRecords[allergenName];
        if (allergen) {
          await prisma.productAllergenTag.upsert({
            where: { productId_allergenId: { productId: product.id, allergenId: allergen.id } },
            update: {},
            create: { productId: product.id, allergenId: allergen.id, severity: 'contains' },
          });
        }
      }
    }

    // Add variants
    if (variants) {
      for (const v of variants) {
        await prisma.productVariant.upsert({
          where: { sku: `${p.slug}-${v.name.toLowerCase().replace(/\s+/g, '-')}` },
          update: {},
          create: {
            productId: product.id,
            name: v.name,
            type: v.type,
            price: v.price,
            sku: `${p.slug}-${v.name.toLowerCase().replace(/\s+/g, '-')}`,
          },
        });
      }
    }
  }

  // ─── PROMO CODES ────────────────────────────────────
  console.log('🎫 Creating promo codes...');
  const promos = [
    { code: 'WELCOME15', type: 'PERCENTAGE', value: 15, description: '15% off your first order', maxUses: 500, maxUsesPerUser: 1 },
    { code: 'DESERT10', type: 'FIXED_AMOUNT', value: 10, description: '$10 off orders over $50', minOrderAmount: 50, maxUses: 200 },
    { code: 'SWEETLOCAL', type: 'PERCENTAGE', value: 20, description: '20% off for local residents', maxUses: 100, expiresAt: new Date('2026-06-30') },
  ];

  for (const promo of promos) {
    await prisma.promo.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    });
  }

  // ─── STORE HOURS ────────────────────────────────────
  console.log('🕐 Creating store hours...');
  const hours = [
    { dayOfWeek: 0, openTime: '08:00', closeTime: '16:00', isClosed: false }, // Sunday
    { dayOfWeek: 1, openTime: '07:00', closeTime: '17:00', isClosed: true },  // Monday (closed)
    { dayOfWeek: 2, openTime: '07:00', closeTime: '17:00', isClosed: true },  // Tuesday (closed)
    { dayOfWeek: 3, openTime: '07:00', closeTime: '17:00', isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: '07:00', closeTime: '17:00', isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: '07:00', closeTime: '18:00', isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: '07:00', closeTime: '18:00', isClosed: false }, // Saturday
  ];

  for (const h of hours) {
    await prisma.storeHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: {},
      create: h,
    });
  }

  // ─── KB CATEGORIES ──────────────────────────────────
  console.log('📚 Creating KB categories...');
  const kbCategoryData = [
    { name: 'Ordering', slug: 'ordering', isPublic: true },
    { name: 'Products', slug: 'products', isPublic: true },
    { name: 'Delivery & Pickup', slug: 'delivery-pickup', isPublic: true },
    { name: 'Allergens & Dietary', slug: 'allergens-dietary', isPublic: true },
    { name: 'Catering', slug: 'catering', isPublic: true },
    { name: 'Policies', slug: 'policies', isPublic: true },
    { name: 'Staff SOPs', slug: 'staff-sops', isPublic: false },
  ];

  const kbCategories = {};
  for (const cat of kbCategoryData) {
    const c = await prisma.kbCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    kbCategories[cat.slug] = c;
  }

  // ─── KB ARTICLES (Customer-facing) ──────────────────
  console.log('📝 Creating KB articles...');
  const customerArticles = [
    { category: 'ordering', title: 'How to Place an Order', slug: 'how-to-place-an-order', content: 'Visit our website, browse our menu, add items to your cart, and proceed to checkout. You can order as a guest or create an account for faster future orders. Choose between pickup at our Joshua Tree location or local delivery.', isFaq: true },
    { category: 'ordering', title: 'Can I Modify My Order?', slug: 'can-i-modify-my-order', content: 'Orders can be modified up to 2 hours before your scheduled pickup/delivery time. Contact us at (760) 555-BAKE or reply to your confirmation email. After the cutoff, our bakers may have already started preparing your items.', isFaq: true },
    { category: 'ordering', title: 'What Payment Methods Do You Accept?', slug: 'payment-methods', content: 'We accept all major credit cards (Visa, Mastercard, Amex, Discover) through our secure Stripe payment system. In-store, we also accept cash and Apple Pay/Google Pay.', isFaq: true },
    { category: 'delivery-pickup', title: 'Delivery Area & Fees', slug: 'delivery-area-fees', content: 'We deliver to Joshua Tree, Yucca Valley, Twentynine Palms, and Morongo Valley. Delivery fee is $5.99 for orders under $50, and FREE for orders over $50. Delivery is available Wednesday through Saturday.', isFaq: true },
    { category: 'delivery-pickup', title: 'Pickup Information', slug: 'pickup-information', content: 'Pickup is available at our bakery at 123 Canyon Road, Joshua Tree, CA 92252. During checkout, select your preferred pickup window. Please bring your order confirmation email or number. Orders are held for 2 hours past the scheduled time.', isFaq: true },
    { category: 'allergens-dietary', title: 'Allergen Information', slug: 'allergen-information', content: 'All of our products are clearly labeled with allergen information. Our bakery handles wheat, dairy, eggs, nuts (tree nuts and peanuts), soy, and sesame. While we take precautions, we cannot guarantee a completely allergen-free environment. Our gluten-free items are prepared in a dedicated area but in the same facility. Please contact us if you have severe allergies.', isFaq: true },
    { category: 'allergens-dietary', title: 'Gluten-Free Options', slug: 'gluten-free-options', content: 'We offer a growing selection of gluten-free pastries made with almond and rice flours. These include our GF Chocolate Brownie and GF Lemon Poppy Seed Muffin. All GF items are prepared in a dedicated area, but our facility does process wheat. We label items accordingly.', isFaq: true },
    { category: 'products', title: 'Our Ingredients', slug: 'our-ingredients', content: 'We use premium, locally-sourced ingredients whenever possible. Our butter is European-style with 82% butterfat. Our chocolate is Valrhona. Our flour is organic. We source honey from local Joshua Tree beekeepers and fruits from Southern California farms. No artificial preservatives.', isFaq: false },
    { category: 'catering', title: 'Catering & Bulk Orders', slug: 'catering-bulk-orders', content: 'We love catering! From desert weddings to corporate events, we can create custom pastry spreads. Minimum order is $150 for catering. We need at least 72 hours notice for standard orders, and 2 weeks for custom cakes. Visit our catering page to submit a request.', isFaq: true },
    { category: 'policies', title: 'Refund & Cancellation Policy', slug: 'refund-cancellation-policy', content: 'Cancellations made 24+ hours before scheduled pickup/delivery receive a full refund. Cancellations within 24 hours receive a 50% refund or full store credit. Custom cakes are non-refundable once production begins. If there\'s an issue with your order, please contact us within 24 hours and we\'ll make it right.', isFaq: true },
    { category: 'delivery-pickup', title: 'Delivery Tips & Timing', slug: 'delivery-tips-timing', content: 'Our delivery windows are 2-hour blocks. You\'ll receive a text when your order is on its way. Please ensure someone is available to receive the order — baked goods are best enjoyed fresh! During hot desert months, we use insulated packaging to keep everything perfect.', isFaq: false },
    { category: 'products', title: 'Seasonal Menu Rotation', slug: 'seasonal-menu-rotation', content: 'Our seasonal menu changes quarterly, inspired by desert seasons and local ingredients. Spring features flowering cactus and citrus. Summer brings stone fruits and lighter fare. Fall welcomes warm spices and harvest flavors. Winter offers cozy, rich indulgences. Follow our social media for sneak peeks.', isFaq: false },
  ];

  for (const article of customerArticles) {
    await prisma.kbArticle.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        categoryId: kbCategories[article.category].id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        isPublished: true,
        isFaq: article.isFaq || false,
        isInternal: false,
      },
    });
  }

  // ─── SOP ARTICLES (Internal) ────────────────────────
  console.log('📋 Creating SOP articles...');
  const sopArticles = [
    { title: 'How to Pack Croissants', slug: 'sop-pack-croissants', content: '1. Allow croissants to cool for 15 minutes after baking.\n2. Place in tissue-lined kraft box.\n3. Separate layers with parchment.\n4. Maximum 6 per box.\n5. Close box gently — do not press down.\n6. Apply branded sticker seal.\n7. For delivery orders, place in insulated bag during summer months.' },
    { title: 'Opening Procedures', slug: 'sop-opening-procedures', content: '1. Arrive by 5:30 AM.\n2. Disarm alarm (code on staff board).\n3. Turn on ovens — preheat to specified temps.\n4. Check prep sheet for the day\'s production.\n5. Pull butter from walk-in (needs to temper 20 min).\n6. Start coffee for staff.\n7. Review online orders for the day.\n8. Begin production per schedule.' },
    { title: 'Closing Procedures', slug: 'sop-closing-procedures', content: '1. Turn off all ovens and equipment.\n2. Clean all prep surfaces with food-safe sanitizer.\n3. Sweep and mop floors.\n4. Take inventory of remaining items.\n5. Package day-old items for donation pickup.\n6. Run dishwasher final cycle.\n7. Lock walk-in cooler.\n8. Set alarm and lock up.' },
    { title: 'Handling Allergen Requests', slug: 'sop-allergen-requests', content: '1. Take ALL allergen requests seriously.\n2. Check product allergen tags in the system.\n3. If customer has a severe allergy, recommend they consult their doctor.\n4. Never guarantee "allergen-free" — use "made without [allergen]" language.\n5. For custom orders, clearly mark the order with allergen notes.\n6. Use dedicated GF prep area for gluten-free items.\n7. Change gloves between handling different allergen groups.' },
    { title: 'Refund Processing', slug: 'sop-refund-processing', content: '1. Listen to customer complaint fully.\n2. Document the issue with photos if possible.\n3. For quality issues: offer full replacement or refund.\n4. Refunds under $50: process immediately.\n5. Refunds over $50: get manager approval.\n6. Use Stripe dashboard or admin panel to process refund.\n7. Send apology email template.\n8. Log the issue in the quality tracker.' },
    { title: 'POS Quick Reference', slug: 'sop-pos-reference', content: '1. Login with your staff PIN.\n2. Select Walk-in, Pickup, or Delivery.\n3. Search or browse products.\n4. Tap to add items — use +/- for quantity.\n5. Apply promo code if customer has one.\n6. Select Cash or Card payment.\n7. For cash: enter amount tendered, give change.\n8. For card: follow terminal prompts.\n9. Print or email receipt.\n10. Order auto-syncs to kitchen display.' },
    { title: 'Cake Order Protocol', slug: 'sop-cake-orders', content: '1. Custom cakes require 2-week lead time.\n2. Standard cakes require 72-hour lead time.\n3. Get all details: size, flavor, filling, frosting, decorations, allergens, inscription.\n4. For complex designs, request reference photos.\n5. Calculate pricing based on size + complexity tier.\n6. Take 50% deposit at time of order.\n7. Confirm pickup/delivery date and time.\n8. Add to production calendar.\n9. Call customer 48 hours before for final confirmation.' },
    { title: 'Delivery Driver Checklist', slug: 'sop-delivery-driver', content: '1. Check all orders against delivery manifes.\n2. Verify items match order (count & visual check).\n3. Pack in insulated bags — cold packs in summer.\n4. Load carefully — cakes on flat surface.\n5. Follow delivery route in GPS order.\n6. Text/call customer 10 min before arrival.\n7. Get photo of delivery if left at door.\n8. Mark order as delivered in system.\n9. Return insulated bags to bakery.' },
    { title: 'Waste & Spoilage Logging', slug: 'sop-waste-logging', content: '1. All waste must be logged daily before close.\n2. Go to Admin > Inventory > Log Transaction.\n3. Select item and choose "Waste" type.\n4. Enter quantity and reason.\n5. For day-old items: log separately as "donation/markdown."\n6. Quality issues: note specific problem (overbaked, wrong batch, etc.).\n7. Manager reviews waste log weekly for patterns.' },
    { title: 'Inventory Receiving', slug: 'sop-inventory-receiving', content: '1. Check delivery against purchase order.\n2. Inspect items for quality and temperature.\n3. Reject any items that don\'t meet standards.\n4. Log received items in inventory system.\n5. Store in proper locations (dry, refrigerated, frozen).\n6. FIFO: rotate stock — new items behind old.\n7. Update PO status to "Received" in admin.\n8. Report discrepancies to manager immediately.' },
  ];

  for (const sop of sopArticles) {
    await prisma.kbArticle.upsert({
      where: { slug: sop.slug },
      update: {},
      create: {
        categoryId: kbCategories['staff-sops'].id,
        title: sop.title,
        slug: sop.slug,
        content: sop.content,
        isPublished: true,
        isFaq: false,
        isInternal: true,
      },
    });
  }

  // ─── DELIVERY ZIPS ──────────────────────────────────
  console.log('📍 Creating delivery settings...');
  await prisma.setting.upsert({
    where: { key: 'delivery_zips' },
    update: {},
    create: {
      key: 'delivery_zips',
      value: ['92252', '92284', '92277', '92256', '92278', '92285', '92286'],
    },
  });

  await prisma.setting.upsert({
    where: { key: 'delivery_fee' },
    update: {},
    create: { key: 'delivery_fee', value: { amount: 5.99, freeThreshold: 50 } },
  });

  await prisma.setting.upsert({
    where: { key: 'tax_rate' },
    update: {},
    create: { key: 'tax_rate', value: { rate: 0.0775 } },
  });

  await prisma.setting.upsert({
    where: { key: 'bakery_info' },
    update: {},
    create: {
      key: 'bakery_info',
      value: {
        name: 'Painted Canyon Pastries',
        address: '123 Canyon Road',
        city: 'Joshua Tree',
        state: 'CA',
        zip: '92252',
        phone: '(760) 555-BAKE',
        email: 'hello@paintedcanyonpastries.com',
        website: 'https://paintedcanyonpastries.com',
      },
    },
  });

  // ─── SAMPLE TIMESLOTS ───────────────────────────────
  console.log('📅 Creating sample timeslots...');
  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const day = date.getDay();

    // Skip Monday and Tuesday (closed days)
    if (day === 1 || day === 2) continue;

    const slots = [
      { start: '07:00', end: '09:00' },
      { start: '09:00', end: '11:00' },
      { start: '11:00', end: '13:00' },
      { start: '13:00', end: '15:00' },
      { start: '15:00', end: '17:00' },
    ];

    for (const slot of slots) {
      for (const type of ['PICKUP', 'DELIVERY']) {
        // Skip delivery before 9am and after 3pm
        if (type === 'DELIVERY' && (slot.start === '07:00' || slot.start === '15:00')) continue;

        try {
          await prisma.timeslot.upsert({
            where: {
              date_startTime_type: {
                date: new Date(date.toISOString().split('T')[0]),
                startTime: slot.start,
                type,
              },
            },
            update: {},
            create: {
              date: new Date(date.toISOString().split('T')[0]),
              startTime: slot.start,
              endTime: slot.end,
              type,
              maxCapacity: type === 'DELIVERY' ? 15 : 25,
            },
          });
        } catch (e) {
          // Skip if already exists
        }
      }
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('📧 Admin login: admin@paintedcanyonpastries.com / admin123!');
  console.log('📧 Baker login: baker@paintedcanyonpastries.com / baker123!');
  console.log('📧 Cashier POS PIN: 9012');
  console.log('📧 Customer login: sarah@example.com / customer123!');
  console.log('🎫 Promo codes: WELCOME15, DESERT10, SWEETLOCAL');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
