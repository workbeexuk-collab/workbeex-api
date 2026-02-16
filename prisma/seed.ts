import { PrismaClient, UserType, UserStatus, PriceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate random number in range
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// UK Cities with coordinates
const ukLocations = [
  { city: 'London', lat: 51.5074, lng: -0.1278, postcodes: ['SW1A 1AA', 'EC1A 1BB', 'W1A 0AX', 'NW1 6XE'] },
  { city: 'Manchester', lat: 53.4808, lng: -2.2426, postcodes: ['M1 1AE', 'M2 5DB', 'M3 4LZ'] },
  { city: 'Birmingham', lat: 52.4862, lng: -1.8904, postcodes: ['B1 1AA', 'B2 4QA', 'B3 2NS'] },
  { city: 'Leeds', lat: 53.8008, lng: -1.5491, postcodes: ['LS1 1UR', 'LS2 7EW', 'LS3 1AB'] },
  { city: 'Liverpool', lat: 53.4084, lng: -2.9916, postcodes: ['L1 0AA', 'L2 2DP', 'L3 9SJ'] },
  { city: 'Bristol', lat: 51.4545, lng: -2.5879, postcodes: ['BS1 1AA', 'BS2 0DD', 'BS3 1QG'] },
  { city: 'Sheffield', lat: 53.3811, lng: -1.4701, postcodes: ['S1 1AA', 'S2 4SU', 'S3 7HQ'] },
  { city: 'Edinburgh', lat: 55.9533, lng: -3.1883, postcodes: ['EH1 1AA', 'EH2 2ER', 'EH3 9AW'] },
  { city: 'Glasgow', lat: 55.8642, lng: -4.2518, postcodes: ['G1 1AA', 'G2 1DY', 'G3 8AG'] },
  { city: 'Cardiff', lat: 51.4816, lng: -3.1791, postcodes: ['CF10 1AA', 'CF11 9LJ', 'CF14 3UZ'] },
];

// Istanbul districts for testing (Turkey)
const istanbulLocations = [
  { city: 'Kadıköy', lat: 40.9927, lng: 29.0277, postcodes: ['34710', '34714', '34720'] },
  { city: 'Beşiktaş', lat: 41.0429, lng: 29.0054, postcodes: ['34340', '34347', '34353'] },
  { city: 'Üsküdar', lat: 41.0234, lng: 29.0155, postcodes: ['34660', '34662', '34664'] },
  { city: 'Şişli', lat: 41.0602, lng: 28.9877, postcodes: ['34360', '34365', '34381'] },
  { city: 'Bakırköy', lat: 40.9798, lng: 28.8772, postcodes: ['34140', '34142', '34144'] },
  { city: 'Ataşehir', lat: 40.9830, lng: 29.1270, postcodes: ['34750', '34752', '34755'] },
  { city: 'Maltepe', lat: 40.9327, lng: 29.1551, postcodes: ['34840', '34843', '34846'] },
  { city: 'Kartal', lat: 40.8891, lng: 29.1856, postcodes: ['34860', '34862', '34865'] },
  { city: 'Sarıyer', lat: 41.1670, lng: 29.0575, postcodes: ['34460', '34467', '34470'] },
  { city: 'Beyoğlu', lat: 41.0370, lng: 28.9775, postcodes: ['34420', '34421', '34433'] },
];

// Istanbul provider profiles (Turkish names)
const istanbulProviderProfiles = [
  {
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    email: 'ahmet.yilmaz@example.com',
    bio: '15 yıllık tecrübeli elektrikçi. Ev ve işyeri elektrik tesisatı, arıza tamir, aydınlatma sistemleri. Aynı gün servis.',
    services: ['electrical'],
    hourlyRate: 150,
    avatar: null,
  },
  {
    firstName: 'Mehmet',
    lastName: 'Demir',
    email: 'mehmet.demir@example.com',
    bio: 'Profesyonel temizlik hizmeti. Derin temizlik, inşaat sonrası temizlik, ofis temizliği. Garantili hizmet.',
    services: ['cleaning'],
    hourlyRate: 100,
    avatar: null,
  },
  {
    firstName: 'Ayşe',
    lastName: 'Kaya',
    email: 'ayse.kaya@example.com',
    bio: 'Deneyimli bahçıvan. Bahçe düzenleme, çim bakımı, bitki bakımı, budama işleri. Ücretsiz keşif.',
    services: ['gardening'],
    hourlyRate: 120,
    avatar: null,
  },
  {
    firstName: 'Mustafa',
    lastName: 'Öztürk',
    email: 'mustafa.ozturk@example.com',
    bio: 'Usta tesisatçı. Su kaçağı, tıkanıklık açma, banyo/mutfak montaj, kombi bakım. 7/24 acil servis.',
    services: ['plumbing', 'hvac'],
    hourlyRate: 180,
    avatar: null,
  },
  {
    firstName: 'Fatma',
    lastName: 'Çelik',
    email: 'fatma.celik@example.com',
    bio: 'Profesyonel boyacı ve dekoratör. İç cephe, dış cephe, dekoratif boya uygulamaları. Ücretsiz renk danışmanlığı.',
    services: ['painting'],
    hourlyRate: 130,
    avatar: null,
  },
  {
    firstName: 'Ali',
    lastName: 'Şahin',
    email: 'ali.sahin@example.com',
    bio: 'Güvenilir nakliyat firması. Evden eve, ofis taşıma, eşya depolama. Sigortalı taşımacılık.',
    services: ['moving'],
    hourlyRate: 200,
    avatar: null,
  },
  {
    firstName: 'Zeynep',
    lastName: 'Yıldız',
    email: 'zeynep.yildiz@example.com',
    bio: 'Uzman marangoz. Mobilya tamiri, ahşap işleri, kapı montajı, özel tasarım mobilya.',
    services: ['carpentry', 'handyman'],
    hourlyRate: 140,
    avatar: null,
  },
  {
    firstName: 'Emre',
    lastName: 'Arslan',
    email: 'emre.arslan@example.com',
    bio: 'Profesyonel çilingir. Kapı açma, kilit değiştirme, çelik kapı montajı. 7/24 acil servis.',
    services: ['locksmith'],
    hourlyRate: 160,
    avatar: null,
  },
  {
    firstName: 'Seda',
    lastName: 'Koç',
    email: 'seda.koc@example.com',
    bio: 'Beyaz eşya tamiri uzmanı. Bulaşık makinesi, çamaşır makinesi, buzdolabı, fırın tamiri.',
    services: ['appliance_repair'],
    hourlyRate: 150,
    avatar: null,
  },
  {
    firstName: 'Burak',
    lastName: 'Aydın',
    email: 'burak.aydin@example.com',
    bio: 'Klima ve ısıtma sistemleri uzmanı. Klima montaj, kombi bakım, merkezi sistem. Enerji tasarruflu çözümler.',
    services: ['hvac'],
    hourlyRate: 170,
    avatar: null,
  },
  {
    firstName: 'Elif',
    lastName: 'Güneş',
    email: 'elif.gunes@example.com',
    bio: 'Detaylı ev temizliği uzmanı. Düzenli temizlik, taşınma öncesi/sonrası temizlik. Çevre dostu ürünler.',
    services: ['cleaning'],
    hourlyRate: 90,
    avatar: null,
  },
  {
    firstName: 'Oğuz',
    lastName: 'Yalçın',
    email: 'oguz.yalcin@example.com',
    bio: '20 yıl tecrübeli usta boyacı. Duvar kağıdı, alçı sıva, kartonpiyer, dekoratif boyalar.',
    services: ['painting', 'handyman'],
    hourlyRate: 145,
    avatar: null,
  },
];

// Provider profiles data
const providerProfiles = [
  {
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@example.com',
    bio: 'Professional cleaner with over 8 years of experience. Specializing in deep cleaning, end of tenancy, and commercial spaces. Fully insured and DBS checked.',
    services: ['cleaning'],
    hourlyRate: 25,
    avatar: null,
  },
  {
    firstName: 'Sarah',
    lastName: 'Thompson',
    email: 'sarah.thompson@example.com',
    bio: 'Certified electrician with 12 years of experience. Specializing in rewiring, fuse box upgrades, and smart home installations. NICEIC registered.',
    services: ['electrical'],
    hourlyRate: 45,
    avatar: null,
  },
  {
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@example.com',
    bio: 'Experienced plumber offering emergency repairs, bathroom installations, and central heating services. Gas Safe registered.',
    services: ['plumbing', 'hvac'],
    hourlyRate: 40,
    avatar: null,
  },
  {
    firstName: 'Emma',
    lastName: 'Davis',
    email: 'emma.davis@example.com',
    bio: 'Professional painter and decorator with an eye for detail. Interior and exterior work, wallpapering, and colour consultations available.',
    services: ['painting'],
    hourlyRate: 30,
    avatar: null,
  },
  {
    firstName: 'David',
    lastName: 'Taylor',
    email: 'david.taylor@example.com',
    bio: 'Skilled handyman for all your home repair needs. From flat-pack assembly to tiling, no job too small. Reliable and punctual.',
    services: ['handyman', 'carpentry'],
    hourlyRate: 28,
    avatar: null,
  },
  {
    firstName: 'Sophie',
    lastName: 'Martinez',
    email: 'sophie.martinez@example.com',
    bio: 'Professional gardener and landscaper. Garden design, maintenance, lawn care, and tree surgery. Transform your outdoor space!',
    services: ['gardening'],
    hourlyRate: 22,
    avatar: null,
  },
  {
    firstName: 'Robert',
    lastName: 'Anderson',
    email: 'robert.anderson@example.com',
    bio: 'Reliable removal service with 10+ years experience. House moves, office relocations, and single item transport. Fully insured.',
    services: ['moving'],
    hourlyRate: 35,
    avatar: null,
  },
  {
    firstName: 'Lisa',
    lastName: 'White',
    email: 'lisa.white@example.com',
    bio: 'Qualified tutor specializing in Maths and Science for GCSE and A-Level students. Patient approach with proven results.',
    services: ['tutoring'],
    hourlyRate: 35,
    avatar: null,
  },
  {
    firstName: 'Chris',
    lastName: 'Johnson',
    email: 'chris.johnson@example.com',
    bio: 'Award-winning photographer for weddings, events, and portraits. Modern and creative style. Drone photography available.',
    services: ['photography'],
    hourlyRate: 75,
    avatar: null,
  },
  {
    firstName: 'Amy',
    lastName: 'Clark',
    email: 'amy.clark@example.com',
    bio: 'Certified personal trainer with 6 years experience. Weight loss, muscle building, and rehabilitation programs. Online coaching available.',
    services: ['personal_training'],
    hourlyRate: 45,
    avatar: null,
  },
  {
    firstName: 'Tom',
    lastName: 'Harris',
    email: 'tom.harris@example.com',
    bio: 'Professional dog walker and pet sitter. Daily walks, overnight stays, and puppy visits. Fully insured and pet first aid certified.',
    services: ['pet_care'],
    hourlyRate: 15,
    avatar: null,
  },
  {
    firstName: 'Rachel',
    lastName: 'Lewis',
    email: 'rachel.lewis@example.com',
    bio: 'Emergency locksmith available 24/7. Lock changes, key cutting, and security upgrades. No call-out fee within 10 miles.',
    services: ['locksmith'],
    hourlyRate: 50,
    avatar: null,
  },
  {
    firstName: 'Mark',
    lastName: 'Robinson',
    email: 'mark.robinson@example.com',
    bio: 'Appliance repair specialist. Washing machines, dishwashers, ovens, and fridges. Same-day service available. All major brands.',
    services: ['appliance_repair'],
    hourlyRate: 40,
    avatar: null,
  },
  {
    firstName: 'Jennifer',
    lastName: 'Walker',
    email: 'jennifer.walker@example.com',
    bio: 'Deep cleaning specialist with eco-friendly products. Perfect for end of tenancy, spring cleaning, and Airbnb turnovers.',
    services: ['cleaning'],
    hourlyRate: 28,
    avatar: null,
  },
  {
    firstName: 'Daniel',
    lastName: 'Hall',
    email: 'daniel.hall@example.com',
    bio: 'Master carpenter with 15 years experience. Bespoke furniture, fitted wardrobes, and kitchen installations. Portfolio available.',
    services: ['carpentry', 'handyman'],
    hourlyRate: 38,
    avatar: null,
  },
];

// Customer profiles
const customerProfiles = [
  { firstName: 'Oliver', lastName: 'Smith', email: 'oliver.smith@example.com' },
  { firstName: 'Charlotte', lastName: 'Jones', email: 'charlotte.jones@example.com' },
  { firstName: 'Harry', lastName: 'Williams', email: 'harry.williams@example.com' },
  { firstName: 'Amelia', lastName: 'Brown', email: 'amelia.brown@example.com' },
  { firstName: 'George', lastName: 'Taylor', email: 'george.taylor@example.com' },
];

// Review comments
const reviewComments = [
  { rating: 5, comment: 'Absolutely fantastic service! Arrived on time, very professional, and did an excellent job. Would highly recommend to anyone.' },
  { rating: 5, comment: 'Brilliant work! Very thorough and left everything spotless. Will definitely use again.' },
  { rating: 4, comment: 'Great service overall. Very friendly and professional. Minor delay but communicated well.' },
  { rating: 5, comment: 'Exceeded all expectations. Punctual, polite, and the quality of work was outstanding.' },
  { rating: 4, comment: 'Very good job done. Reasonable price and efficient service. Happy with the results.' },
  { rating: 5, comment: 'Best service I have used! Went above and beyond what was expected. Thank you!' },
  { rating: 3, comment: 'Decent service but took longer than expected. End result was satisfactory.' },
  { rating: 5, comment: 'Professional from start to finish. Clear communication and excellent workmanship.' },
  { rating: 4, comment: 'Reliable and trustworthy. Did exactly what was agreed. Would use again.' },
  { rating: 5, comment: 'Amazing attention to detail! Left my home looking brand new. Highly recommended!' },
];

// Provider responses
const providerResponses = [
  'Thank you so much for your kind words! It was a pleasure working with you.',
  'Really appreciate the feedback! Looking forward to helping you again.',
  'Thanks for the great review! Always happy to help.',
  'Thank you! Your satisfaction is our top priority.',
  'So glad you were happy with the service! See you next time.',
];

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  const passwordHash = await bcrypt.hash('Test1234', 12);

  // ============ CREATE TEST ACCOUNTS ============
  console.log('Creating test accounts...');

  const testUsers = [
    { email: 'customer@example.com', firstName: 'John', lastName: 'Customer', type: UserType.CUSTOMER },
    { email: 'provider@example.com', firstName: 'Jane', lastName: 'Provider', type: UserType.PROVIDER },
    { email: 'admin@example.com', firstName: 'Admin', lastName: 'User', type: UserType.ADMIN },
  ];

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        type: user.type,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        phone: '+4477009000' + randomInt(10, 99),
      },
    });
  }

  // Create Provider profile for test provider account
  const testProviderUser = await prisma.user.findUnique({ where: { email: 'provider@example.com' } });
  if (testProviderUser) {
    await prisma.provider.upsert({
      where: { userId: testProviderUser.id },
      update: {},
      create: {
        userId: testProviderUser.id,
        bio: 'Experienced professional offering quality services. I take pride in my work and ensure customer satisfaction on every job.',
        hourlyRate: 45,
        responseTime: 12,
        location: 'London, UK',
        latitude: 51.5074,
        longitude: -0.1278,
        serviceRadius: 30,
        verified: true,
        verifiedAt: new Date(),
        rating: 4.8,
        reviewCount: 25,
        completedJobs: 50,
        trustScore: 85,
        isOnline: true,
        lastActiveAt: new Date(),
      },
    });
  }

  // ============ CREATE SERVICES ============
  console.log('Creating services...');

  const servicesData = [
    { key: 'cleaning', slug: 'cleaning', icon: 'Sparkles', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80', popular: true, sortOrder: 1, en: 'Cleaning', tr: 'Temizlik' },
    { key: 'plumbing', slug: 'plumbing', icon: 'Wrench', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80', popular: true, sortOrder: 2, en: 'Plumbing', tr: 'Tesisat' },
    { key: 'electrical', slug: 'electrical', icon: 'Zap', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80', popular: true, sortOrder: 3, en: 'Electrical', tr: 'Elektrik' },
    { key: 'moving', slug: 'moving', icon: 'Truck', image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=80', popular: true, sortOrder: 4, en: 'Moving', tr: 'Nakliyat' },
    { key: 'painting', slug: 'painting', icon: 'Paintbrush', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80', popular: true, sortOrder: 5, en: 'Painting', tr: 'Boyacılık' },
    { key: 'gardening', slug: 'gardening', icon: 'Leaf', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80', popular: false, sortOrder: 6, en: 'Gardening', tr: 'Bahçıvanlık' },
    { key: 'handyman', slug: 'handyman', icon: 'Hammer', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80', popular: true, sortOrder: 7, en: 'Handyman', tr: 'Tadilat' },
    { key: 'tutoring', slug: 'tutoring', icon: 'GraduationCap', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', popular: false, sortOrder: 8, en: 'Tutoring', tr: 'Özel Ders' },
    { key: 'photography', slug: 'photography', icon: 'Camera', image: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&q=80', popular: false, sortOrder: 9, en: 'Photography', tr: 'Fotoğrafçılık' },
    { key: 'personal_training', slug: 'personal-training', icon: 'Dumbbell', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', popular: false, sortOrder: 10, en: 'Personal Training', tr: 'Kişisel Antrenör' },
    { key: 'pet_care', slug: 'pet-care', icon: 'Heart', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80', popular: false, sortOrder: 11, en: 'Pet Care', tr: 'Evcil Hayvan Bakımı' },
    { key: 'carpentry', slug: 'carpentry', icon: 'Hammer', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', popular: false, sortOrder: 12, en: 'Carpentry', tr: 'Marangozluk' },
    { key: 'locksmith', slug: 'locksmith', icon: 'Key', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', popular: false, sortOrder: 13, en: 'Locksmith', tr: 'Çilingir' },
    { key: 'appliance_repair', slug: 'appliance-repair', icon: 'Settings', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80', popular: false, sortOrder: 14, en: 'Appliance Repair', tr: 'Beyaz Eşya Tamiri' },
    { key: 'hvac', slug: 'hvac', icon: 'Thermometer', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80', popular: false, sortOrder: 15, en: 'HVAC', tr: 'Klima ve Isıtma' },
  ];

  const serviceMap: Record<string, string> = {};

  for (const svc of servicesData) {
    const service = await prisma.service.upsert({
      where: { key: svc.key },
      update: { popular: svc.popular, sortOrder: svc.sortOrder, image: svc.image },
      create: {
        key: svc.key,
        slug: svc.slug,
        icon: svc.icon,
        image: svc.image,
        popular: svc.popular,
        sortOrder: svc.sortOrder,
      },
    });
    serviceMap[svc.key] = service.id;

    // Add translations
    await prisma.serviceTranslation.upsert({
      where: { serviceId_language: { serviceId: service.id, language: 'en' } },
      update: { name: svc.en },
      create: { serviceId: service.id, language: 'en', name: svc.en, description: `Professional ${svc.en.toLowerCase()} services in your area.` },
    });
    await prisma.serviceTranslation.upsert({
      where: { serviceId_language: { serviceId: service.id, language: 'tr' } },
      update: { name: svc.tr },
      create: { serviceId: service.id, language: 'tr', name: svc.tr, description: `Bölgenizde profesyonel ${svc.tr.toLowerCase()} hizmetleri.` },
    });
  }
  console.log(`  ✓ Created ${servicesData.length} services`);

  // Add services to test provider account
  if (testProviderUser) {
    const testProvider = await prisma.provider.findUnique({ where: { userId: testProviderUser.id } });
    if (testProvider) {
      const servicesToAdd = ['cleaning', 'plumbing', 'handyman'];
      for (const serviceKey of servicesToAdd) {
        const serviceId = serviceMap[serviceKey];
        if (serviceId) {
          await prisma.providerService.upsert({
            where: { providerId_serviceId: { providerId: testProvider.id, serviceId } },
            update: {},
            create: {
              providerId: testProvider.id,
              serviceId,
              price: randomDecimal(25, 60),
              priceType: 'HOURLY',
            },
          });
        }
      }
      // Add default availability for test provider
      for (let day = 1; day <= 5; day++) {
        await prisma.providerAvailability.upsert({
          where: { providerId_dayOfWeek: { providerId: testProvider.id, dayOfWeek: day } },
          update: {},
          create: {
            providerId: testProvider.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '18:00',
            isAvailable: true,
          },
        });
      }
      console.log('  ✓ Added services and availability to test provider');
    }
  }

  // ============ CREATE CUSTOMERS ============
  console.log('Creating customers...');

  const customerIds: string[] = [];
  for (const customer of customerProfiles) {
    const location = ukLocations[randomInt(0, ukLocations.length - 1)];
    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: {},
      create: {
        email: customer.email,
        passwordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        type: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: randomInt(0, 1) === 1,
        phone: '+4477009000' + randomInt(10, 99),
        postcode: location.postcodes[randomInt(0, location.postcodes.length - 1)],
      },
    });
    customerIds.push(user.id);
  }
  console.log(`  ✓ Created ${customerProfiles.length} customers`);

  // ============ CREATE PROVIDERS ============
  console.log('Creating providers with profiles...');

  const providerIds: string[] = [];
  for (let i = 0; i < providerProfiles.length; i++) {
    const profile = providerProfiles[i];
    const location = ukLocations[i % ukLocations.length];

    // Create user
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {},
      create: {
        email: profile.email,
        passwordHash,
        firstName: profile.firstName,
        lastName: profile.lastName,
        type: UserType.PROVIDER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        phone: '+4477009001' + randomInt(10, 99),
        avatar: profile.avatar,
        postcode: location.postcodes[0],
      },
    });
    providerIds.push(user.id);

    // Create provider profile
    const completedJobs = randomInt(15, 200);
    const reviewCount = Math.floor(completedJobs * randomDecimal(0.3, 0.7));
    const rating = randomDecimal(4.0, 5.0);

    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {
        bio: profile.bio,
        hourlyRate: profile.hourlyRate,
        rating,
        reviewCount,
        completedJobs,
      },
      create: {
        userId: user.id,
        bio: profile.bio,
        hourlyRate: profile.hourlyRate,
        responseTime: randomInt(1, 24),
        location: `${location.city}, UK`,
        latitude: location.lat + randomDecimal(-0.05, 0.05),
        longitude: location.lng + randomDecimal(-0.05, 0.05),
        serviceRadius: randomInt(10, 30),
        verified: randomInt(0, 10) > 2, // 80% verified
        rating,
        reviewCount,
        completedJobs,
        trustScore: randomInt(60, 100),
        isOnline: randomInt(0, 1) === 1,
        lastActiveAt: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)),
      },
    });

    // Link services
    for (const serviceKey of profile.services) {
      const serviceId = serviceMap[serviceKey];
      if (serviceId) {
        await prisma.providerService.upsert({
          where: { providerId_serviceId: { providerId: provider.id, serviceId } },
          update: {},
          create: {
            providerId: provider.id,
            serviceId,
            price: profile.hourlyRate + randomInt(-5, 10),
            priceType: randomInt(0, 2) === 0 ? PriceType.HOURLY : PriceType.QUOTE_BASED,
          },
        });
      }
    }

    // Create availability (Mon-Fri, 9-5)
    for (let day = 1; day <= 5; day++) {
      await prisma.providerAvailability.upsert({
        where: { providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: day } },
        update: {},
        create: {
          providerId: provider.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
        },
      });
    }
    // Saturday (optional)
    if (randomInt(0, 1) === 1) {
      await prisma.providerAvailability.upsert({
        where: { providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: 6 } },
        update: {},
        create: {
          providerId: provider.id,
          dayOfWeek: 6,
          startTime: '10:00',
          endTime: '14:00',
          isAvailable: true,
        },
      });
    }

    // Create portfolio items (2-4 per provider)
    const portfolioCount = randomInt(2, 4);
    for (let p = 0; p < portfolioCount; p++) {
      const serviceKey = profile.services[p % profile.services.length];
      await prisma.portfolioItem.create({
        data: {
          providerId: provider.id,
          title: `${profile.services[0]} Project ${p + 1}`,
          description: `A recent ${serviceKey} project completed for a satisfied customer in ${location.city}.`,
          imageUrl: `https://picsum.photos/seed/${user.id}${p}/800/600`,
          serviceId: serviceMap[serviceKey],
        },
      });
    }
  }
  console.log(`  ✓ Created ${providerProfiles.length} providers with profiles`);

  // ============ CREATE ISTANBUL PROVIDERS ============
  console.log('Creating Istanbul providers for testing...');

  const istanbulProviderIds: string[] = [];
  for (let i = 0; i < istanbulProviderProfiles.length; i++) {
    const profile = istanbulProviderProfiles[i];
    const location = istanbulLocations[i % istanbulLocations.length];

    // Create user
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {},
      create: {
        email: profile.email,
        passwordHash,
        firstName: profile.firstName,
        lastName: profile.lastName,
        type: UserType.PROVIDER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        phone: '+905' + randomInt(300000000, 599999999),
        avatar: profile.avatar,
        postcode: location.postcodes[0],
      },
    });
    istanbulProviderIds.push(user.id);

    // Create provider profile
    const completedJobs = randomInt(20, 250);
    const reviewCount = Math.floor(completedJobs * randomDecimal(0.3, 0.7));
    const rating = randomDecimal(4.2, 5.0);

    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {
        bio: profile.bio,
        hourlyRate: profile.hourlyRate,
        rating,
        reviewCount,
        completedJobs,
      },
      create: {
        userId: user.id,
        bio: profile.bio,
        hourlyRate: profile.hourlyRate,
        responseTime: randomInt(1, 12),
        location: `${location.city}, İstanbul`,
        latitude: location.lat + randomDecimal(-0.02, 0.02),
        longitude: location.lng + randomDecimal(-0.02, 0.02),
        serviceRadius: randomInt(10, 25),
        verified: randomInt(0, 10) > 1, // 90% verified
        rating,
        reviewCount,
        completedJobs,
        trustScore: randomInt(70, 100),
        isOnline: randomInt(0, 1) === 1,
        lastActiveAt: new Date(Date.now() - randomInt(0, 3 * 24 * 60 * 60 * 1000)),
      },
    });

    // Link services
    for (const serviceKey of profile.services) {
      const serviceId = serviceMap[serviceKey];
      if (serviceId) {
        await prisma.providerService.upsert({
          where: { providerId_serviceId: { providerId: provider.id, serviceId } },
          update: {},
          create: {
            providerId: provider.id,
            serviceId,
            price: profile.hourlyRate + randomInt(-10, 20),
            priceType: randomInt(0, 2) === 0 ? PriceType.HOURLY : PriceType.QUOTE_BASED,
          },
        });
      }
    }

    // Create availability (Mon-Sat)
    for (let day = 1; day <= 6; day++) {
      await prisma.providerAvailability.upsert({
        where: { providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: day } },
        update: {},
        create: {
          providerId: provider.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '19:00',
          isAvailable: true,
        },
      });
    }

    // Create portfolio items
    const portfolioCount = randomInt(2, 5);
    for (let p = 0; p < portfolioCount; p++) {
      const serviceKey = profile.services[p % profile.services.length];
      await prisma.portfolioItem.create({
        data: {
          providerId: provider.id,
          title: `${profile.services[0]} Projesi ${p + 1}`,
          description: `${location.city} bölgesinde tamamlanan ${serviceKey} işi.`,
          imageUrl: `https://picsum.photos/seed/ist${user.id}${p}/800/600`,
          serviceId: serviceMap[serviceKey],
        },
      });
    }
  }
  console.log(`  ✓ Created ${istanbulProviderProfiles.length} Istanbul providers`);

  // ============ CREATE BOOKINGS AND REVIEWS ============
  console.log('Creating bookings and reviews...');

  let bookingCount = 0;
  let reviewsCreated = 0;

  // Get all providers with their users
  const providers = await prisma.provider.findMany({ include: { user: true } });

  for (const provider of providers) {
    // Create 3-8 completed bookings per provider
    const numBookings = randomInt(3, 8);

    for (let b = 0; b < numBookings; b++) {
      const customerId = customerIds[randomInt(0, customerIds.length - 1)];
      const location = ukLocations[randomInt(0, ukLocations.length - 1)];
      const providerServices = await prisma.providerService.findMany({
        where: { providerId: provider.id },
      });

      if (providerServices.length === 0) continue;

      const providerService = providerServices[randomInt(0, providerServices.length - 1)];
      const amount = randomDecimal(50, 300);
      const platformFee = amount * 0.15;
      const scheduledDate = new Date(Date.now() - randomInt(7, 90) * 24 * 60 * 60 * 1000);

      const booking = await prisma.booking.create({
        data: {
          customerId,
          providerId: provider.id,
          serviceId: providerService.serviceId,
          scheduledDate,
          description: 'Service completed successfully.',
          location: `${location.city}, UK`,
          latitude: location.lat,
          longitude: location.lng,
          amount,
          platformFee,
          providerPayout: amount - platformFee,
          status: 'COMPLETED',
          paymentStatus: 'RELEASED',
          completedAt: new Date(scheduledDate.getTime() + randomInt(2, 8) * 60 * 60 * 1000),
        },
      });
      bookingCount++;

      // Create review for 70% of bookings
      if (randomInt(0, 10) >= 3) {
        const reviewData = reviewComments[randomInt(0, reviewComments.length - 1)];
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            authorId: customerId,
            reviewedId: provider.userId,
            rating: reviewData.rating,
            comment: reviewData.comment,
            response: randomInt(0, 10) > 5 ? providerResponses[randomInt(0, providerResponses.length - 1)] : null,
            respondedAt: randomInt(0, 10) > 5 ? new Date() : null,
            helpfulCount: randomInt(0, 15),
            visible: true,
          },
        });
        reviewsCreated++;
      }
    }
  }

  console.log(`  ✓ Created ${bookingCount} bookings`);
  console.log(`  ✓ Created ${reviewsCreated} reviews`);

  // ============ CREATE TESTIMONIALS ============
  console.log('Creating testimonials...');

  const testimonials = [
    {
      authorName: 'Maria K.',
      rating: 5,
      comment: 'Excellent cleaning service! The house has never looked better. Will definitely book again.',
      commentTr: 'Mükemmel temizlik hizmeti! Evim hiç bu kadar temiz olmamıştı. Kesinlikle tekrar rezervasyon yapacağım.',
      service: 'Cleaning',
      serviceTr: 'Temizlik',
    },
    {
      authorName: 'James T.',
      rating: 5,
      comment: 'The plumber fixed our leak in no time. Very professional and fair pricing.',
      commentTr: 'Tesisatçı sızıntıyı kısa sürede tamir etti. Çok profesyonel ve uygun fiyat.',
      service: 'Plumbing',
      serviceTr: 'Tesisat',
    },
    {
      authorName: 'Sophie L.',
      rating: 5,
      comment: 'Great experience from start to finish. Easy booking and amazing results!',
      commentTr: 'Baştan sona harika bir deneyim. Kolay rezervasyon ve muhteşem sonuçlar!',
      service: 'Painting',
      serviceTr: 'Boyacılık',
    },
    {
      authorName: 'David R.',
      rating: 4,
      comment: 'Quick response and quality work. My garden looks beautiful now.',
      commentTr: 'Hızlı yanıt ve kaliteli iş. Bahçem artık çok güzel görünüyor.',
      service: 'Gardening',
      serviceTr: 'Bahçıvanlık',
    },
  ];

  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    const testimonial = await prisma.testimonial.upsert({
      where: { id: `testimonial-${i}` },
      update: {},
      create: {
        id: `testimonial-${i}`,
        authorName: t.authorName,
        rating: t.rating,
        comment: t.comment,
        service: t.service,
        featured: true,
        visible: true,
        sortOrder: i,
      },
    });

    // English translation
    await prisma.testimonialTranslation.upsert({
      where: { testimonialId_language: { testimonialId: testimonial.id, language: 'en' } },
      update: {},
      create: {
        testimonialId: testimonial.id,
        language: 'en',
        comment: t.comment,
        service: t.service,
      },
    });

    // Turkish translation
    await prisma.testimonialTranslation.upsert({
      where: { testimonialId_language: { testimonialId: testimonial.id, language: 'tr' } },
      update: {},
      create: {
        testimonialId: testimonial.id,
        language: 'tr',
        comment: t.commentTr,
        service: t.serviceTr,
      },
    });
  }
  console.log(`  ✓ Created ${testimonials.length} testimonials`);

  // ============ CREATE BLOG POSTS ============
  console.log('Creating blog posts...');

  const blogPosts = [
    {
      slug: 'how-to-prepare-for-cleaning',
      imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400',
      readTime: 3,
      category: 'tips',
      title: 'How to Prepare for a Cleaning',
      titleTr: 'Temizliğe Nasıl Hazırlanılır',
      excerpt: 'Learn how to get your home ready before the cleaner arrives for the best results.',
      excerptTr: 'En iyi sonuçlar için temizlikçi gelmeden önce evinizi nasıl hazırlayacağınızı öğrenin.',
      content: 'Full article content here...',
    },
    {
      slug: 'choosing-the-right-plumber',
      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
      readTime: 5,
      category: 'guide',
      title: 'Choosing the Right Plumber',
      titleTr: 'Doğru Tesisatçıyı Seçmek',
      excerpt: 'A comprehensive guide to finding a reliable plumber for your home.',
      excerptTr: 'Eviniz için güvenilir bir tesisatçı bulmanın kapsamlı rehberi.',
      content: 'Full article content here...',
    },
    {
      slug: 'garden-maintenance-tips',
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
      readTime: 4,
      category: 'tips',
      title: 'Garden Maintenance Tips',
      titleTr: 'Bahçe Bakım İpuçları',
      excerpt: 'Essential tips to keep your garden looking beautiful all year round.',
      excerptTr: 'Bahçenizi yıl boyunca güzel tutmak için temel ipuçları.',
      content: 'Full article content here...',
    },
  ];

  for (let i = 0; i < blogPosts.length; i++) {
    const bp = blogPosts[i];
    const post = await prisma.blogPost.upsert({
      where: { slug: bp.slug },
      update: {},
      create: {
        slug: bp.slug,
        imageUrl: bp.imageUrl,
        readTime: bp.readTime,
        category: bp.category,
        featured: true,
        published: true,
        publishedAt: new Date(),
        sortOrder: i,
      },
    });

    // English translation
    await prisma.blogPostTranslation.upsert({
      where: { blogPostId_language: { blogPostId: post.id, language: 'en' } },
      update: {},
      create: {
        blogPostId: post.id,
        language: 'en',
        title: bp.title,
        excerpt: bp.excerpt,
        content: bp.content,
      },
    });

    // Turkish translation
    await prisma.blogPostTranslation.upsert({
      where: { blogPostId_language: { blogPostId: post.id, language: 'tr' } },
      update: {},
      create: {
        blogPostId: post.id,
        language: 'tr',
        title: bp.titleTr,
        excerpt: bp.excerptTr,
        content: bp.content,
      },
    });
  }
  console.log(`  ✓ Created ${blogPosts.length} blog posts`);

  // ============ CREATE PROMOTIONS ============
  console.log('Creating promotions...');

  const promotion = await prisma.promotion.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      type: 'PERCENTAGE',
      value: 20,
      minOrder: 50,
      maxDiscount: 30,
      usageLimit: 1000,
      perUserLimit: 1,
      featured: true,
      active: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    },
  });

  // Promotion translations
  await prisma.promotionTranslation.upsert({
    where: { promotionId_language: { promotionId: promotion.id, language: 'en' } },
    update: {},
    create: {
      promotionId: promotion.id,
      language: 'en',
      title: 'Get 20% Off',
      description: 'On your first booking',
      tag: 'LIMITED OFFER',
    },
  });

  await prisma.promotionTranslation.upsert({
    where: { promotionId_language: { promotionId: promotion.id, language: 'tr' } },
    update: {},
    create: {
      promotionId: promotion.id,
      language: 'tr',
      title: '%20 İndirim',
      description: 'İlk rezervasyonunuzda',
      tag: 'SINIRLI TEKLİF',
    },
  });
  console.log('  ✓ Created promotions');

  // ============ CREATE PLATFORM STATS ============
  console.log('Calculating platform stats...');

  const [totalProviders, verifiedProviders, completedJobsCount, avgRating, totalCustomers, totalReviews] = await Promise.all([
    prisma.provider.count(),
    prisma.provider.count({ where: { verified: true } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.provider.aggregate({ _avg: { rating: true }, where: { reviewCount: { gt: 0 } } }),
    prisma.user.count({ where: { type: 'CUSTOMER' } }),
    prisma.review.count({ where: { visible: true } }),
  ]);

  await prisma.platformStats.upsert({
    where: { key: 'main' },
    update: {
      totalProviders,
      verifiedProviders,
      completedJobs: completedJobsCount,
      averageRating: avgRating._avg.rating || 0,
      totalCustomers,
      totalReviews,
    },
    create: {
      key: 'main',
      totalProviders,
      verifiedProviders,
      completedJobs: completedJobsCount,
      averageRating: avgRating._avg.rating || 0,
      totalCustomers,
      totalReviews,
    },
  });
  console.log('  ✓ Platform stats calculated');

  // ============ SUMMARY ============
  console.log('\n✅ Seed completed successfully!\n');
  console.log('--- Test Accounts ---');
  console.log('Customer: customer@example.com / Test1234');
  console.log('Provider: provider@example.com / Test1234');
  console.log('Admin:    admin@example.com / Test1234');
  console.log('\n--- Additional Accounts (all use Test1234) ---');
  providerProfiles.slice(0, 5).forEach((p) => console.log(`Provider: ${p.email}`));
  console.log('... and more');
}

// ============ CREATE CANDIDATES ============
async function seedCandidates() {
  console.log('\n🎓 Seeding candidates...');

  const passwordHash = await bcrypt.hash('Test1234', 12);

  const candidateProfiles = [
    {
      firstName: 'Emre',
      lastName: 'Yıldırım',
      email: 'emre.yildirim@example.com',
      headline: 'Senior Frontend Developer | React & TypeScript Expert',
      summary: '8+ yıl deneyimli Frontend Developer. React, TypeScript, Next.js konularında uzman. Performans optimizasyonu ve kullanıcı deneyimi odaklı çalışıyorum. Büyük ölçekli e-ticaret ve fintech projelerinde liderlik deneyimim var.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 45000,
      skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'TailwindCSS', 'GraphQL', 'Jest', 'Cypress'],
      experience: [
        { company: 'Trendyol', title: 'Senior Frontend Developer', years: 3 },
        { company: 'Getir', title: 'Frontend Developer', years: 2 },
        { company: 'Startup XYZ', title: 'Junior Developer', years: 2 },
      ],
      education: { institution: 'İstanbul Teknik Üniversitesi', degree: 'Bilgisayar Mühendisliği', year: 2016 },
    },
    {
      firstName: 'Ayşe',
      lastName: 'Kara',
      email: 'ayse.kara@example.com',
      headline: 'Full Stack Developer | Node.js & React',
      summary: '5 yıl deneyimli Full Stack Developer. Backend ve frontend geliştirmede güçlü. Mikroservis mimarisi, Docker, Kubernetes deneyimi. Agile metodolojilere hakim.',
      location: 'Ankara, Türkiye',
      expectedSalary: 38000,
      skills: ['Node.js', 'React', 'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'TypeScript'],
      experience: [
        { company: 'Turkcell', title: 'Full Stack Developer', years: 2 },
        { company: 'Logo Yazılım', title: 'Software Developer', years: 3 },
      ],
      education: { institution: 'ODTÜ', degree: 'Bilgisayar Mühendisliği', year: 2018 },
    },
    {
      firstName: 'Mehmet',
      lastName: 'Öz',
      email: 'mehmet.oz@example.com',
      headline: 'UI/UX Designer | Figma & Design Systems',
      summary: '6 yıl deneyimli UI/UX Designer. Kullanıcı araştırması, wireframing, prototyping konularında uzman. Design system oluşturma ve yönetme deneyimi. B2B ve B2C projeler.',
      location: 'İzmir, Türkiye',
      expectedSalary: 35000,
      skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'Design Systems', 'HTML/CSS'],
      experience: [
        { company: 'Insider', title: 'Senior UI/UX Designer', years: 3 },
        { company: 'Iyzico', title: 'UI Designer', years: 3 },
      ],
      education: { institution: 'Bilkent Üniversitesi', degree: 'Grafik Tasarım', year: 2017 },
    },
    {
      firstName: 'Zeynep',
      lastName: 'Aksoy',
      email: 'zeynep.aksoy@example.com',
      headline: 'Backend Developer | Java & Spring Boot',
      summary: '7 yıl deneyimli Backend Developer. Java, Spring Boot, mikroservisler konusunda uzman. Yüksek trafikli sistemler geliştirdim. Fintech ve bankacılık sektöründe deneyim.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 50000,
      skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'Redis', 'PostgreSQL', 'Docker', 'Kubernetes'],
      experience: [
        { company: 'Garanti BBVA', title: 'Senior Backend Developer', years: 4 },
        { company: 'Akbank', title: 'Software Developer', years: 3 },
      ],
      education: { institution: 'Boğaziçi Üniversitesi', degree: 'Bilgisayar Mühendisliği', year: 2016 },
    },
    {
      firstName: 'Can',
      lastName: 'Demirci',
      email: 'can.demirci@example.com',
      headline: 'DevOps Engineer | AWS & Kubernetes',
      summary: '5 yıl deneyimli DevOps Engineer. CI/CD pipeline, infrastructure as code, container orchestration konularında uzman. AWS sertifikalı.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 55000,
      skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Jenkins', 'GitLab CI', 'Ansible', 'Linux'],
      experience: [
        { company: 'Hepsiburada', title: 'Senior DevOps Engineer', years: 2 },
        { company: 'n11', title: 'DevOps Engineer', years: 3 },
      ],
      education: { institution: 'Yıldız Teknik Üniversitesi', degree: 'Bilgisayar Mühendisliği', year: 2018 },
    },
    {
      firstName: 'Selin',
      lastName: 'Yılmaz',
      email: 'selin.yilmaz@example.com',
      headline: 'Product Manager | SaaS & Mobile Apps',
      summary: '6 yıl deneyimli Product Manager. SaaS ürünleri ve mobil uygulamalar konusunda uzman. OKR, roadmap planlama, stakeholder yönetimi. Data-driven karar verme.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 60000,
      skills: ['Product Strategy', 'Agile/Scrum', 'Jira', 'Data Analysis', 'A/B Testing', 'User Research', 'SQL'],
      experience: [
        { company: 'Yemeksepeti', title: 'Senior Product Manager', years: 3 },
        { company: 'Armut.com', title: 'Product Manager', years: 3 },
      ],
      education: { institution: 'Koç Üniversitesi', degree: 'İşletme', year: 2017 },
    },
    {
      firstName: 'Burak',
      lastName: 'Şahin',
      email: 'burak.sahin@example.com',
      headline: 'Mobile Developer | React Native & Flutter',
      summary: '4 yıl deneyimli Mobile Developer. Cross-platform mobil uygulama geliştirme konusunda uzman. React Native ve Flutter ile production uygulamalar.',
      location: 'Bursa, Türkiye',
      expectedSalary: 35000,
      skills: ['React Native', 'Flutter', 'iOS', 'Android', 'TypeScript', 'Firebase', 'Redux'],
      experience: [
        { company: 'Getir', title: 'Mobile Developer', years: 2 },
        { company: 'Freelance', title: 'Mobile Developer', years: 2 },
      ],
      education: { institution: 'Uludağ Üniversitesi', degree: 'Yazılım Mühendisliği', year: 2019 },
    },
    {
      firstName: 'Deniz',
      lastName: 'Aydın',
      email: 'deniz.aydin@example.com',
      headline: 'Data Scientist | Machine Learning & Python',
      summary: '5 yıl deneyimli Data Scientist. Makine öğrenmesi, derin öğrenme, NLP konularında uzman. Production ML sistemleri geliştirme ve deploy etme deneyimi.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 55000,
      skills: ['Python', 'TensorFlow', 'PyTorch', 'Pandas', 'SQL', 'Machine Learning', 'Deep Learning', 'NLP'],
      experience: [
        { company: 'Peak Games', title: 'Senior Data Scientist', years: 2 },
        { company: 'Turkcell', title: 'Data Scientist', years: 3 },
      ],
      education: { institution: 'Sabancı Üniversitesi', degree: 'Veri Bilimi Yüksek Lisans', year: 2018 },
    },
    {
      firstName: 'Ece',
      lastName: 'Korkmaz',
      email: 'ece.korkmaz@example.com',
      headline: 'QA Engineer | Test Automation',
      summary: '4 yıl deneyimli QA Engineer. Test otomasyon framework geliştirme, API testing, performance testing konularında uzman. Selenium, Cypress, k6 deneyimi.',
      location: 'Ankara, Türkiye',
      expectedSalary: 30000,
      skills: ['Selenium', 'Cypress', 'Jest', 'Postman', 'k6', 'Python', 'JavaScript', 'CI/CD'],
      experience: [
        { company: 'Vodafone', title: 'QA Engineer', years: 2 },
        { company: 'Softtech', title: 'Test Engineer', years: 2 },
      ],
      education: { institution: 'Hacettepe Üniversitesi', degree: 'Bilgisayar Mühendisliği', year: 2019 },
    },
    {
      firstName: 'Kaan',
      lastName: 'Çetin',
      email: 'kaan.cetin@example.com',
      headline: 'Junior Frontend Developer | React',
      summary: '1 yıl deneyimli Frontend Developer. React ve modern JavaScript konusunda hevesli. Bootcamp mezunu, hızlı öğrenen, takım oyuncusu.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 20000,
      skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git', 'TailwindCSS'],
      experience: [
        { company: 'Tech Startup', title: 'Junior Frontend Developer', years: 1 },
      ],
      education: { institution: 'Patika.dev Bootcamp', degree: 'Frontend Development', year: 2023 },
    },
    {
      firstName: 'Elif',
      lastName: 'Demir',
      email: 'elif.demir@example.com',
      headline: 'Marketing Manager | Digital Marketing',
      summary: '7 yıl deneyimli Marketing Manager. Dijital pazarlama, SEO, SEM, sosyal medya stratejisi konularında uzman. E-ticaret ve B2B deneyimi.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 40000,
      skills: ['Digital Marketing', 'SEO', 'Google Ads', 'Facebook Ads', 'Analytics', 'Content Strategy'],
      experience: [
        { company: 'Morhipo', title: 'Marketing Manager', years: 3 },
        { company: 'Gittigidiyor', title: 'Digital Marketing Specialist', years: 4 },
      ],
      education: { institution: 'Marmara Üniversitesi', degree: 'İşletme', year: 2016 },
    },
    {
      firstName: 'Ali',
      lastName: 'Öztürk',
      email: 'ali.ozturk@example.com',
      headline: 'Sales Representative | B2B SaaS',
      summary: '5 yıl deneyimli Sales Representative. B2B SaaS satış, enterprise müşteri yönetimi, iş geliştirme konularında uzman. CRM sistemlerine hakim.',
      location: 'İstanbul, Türkiye',
      expectedSalary: 35000,
      skills: ['B2B Sales', 'CRM', 'Negotiation', 'Account Management', 'HubSpot', 'Salesforce'],
      experience: [
        { company: 'Insider', title: 'Senior Sales Rep', years: 2 },
        { company: 'Netdata', title: 'Sales Representative', years: 3 },
      ],
      education: { institution: 'Galatasaray Üniversitesi', degree: 'İşletme', year: 2018 },
    },
    // UK-based candidates
    {
      firstName: 'James',
      lastName: 'Mitchell',
      email: 'james.mitchell@example.com',
      headline: 'Senior Software Engineer | Python & Django',
      summary: '10 years experienced Software Engineer specializing in Python backend development. Led teams building scalable microservices. Strong in system design and architecture.',
      location: 'London, UK',
      expectedSalary: 85000,
      skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'System Design'],
      experience: [
        { company: 'Monzo', title: 'Senior Software Engineer', years: 4 },
        { company: 'Deliveroo', title: 'Software Engineer', years: 4 },
        { company: 'Startup', title: 'Junior Developer', years: 2 },
      ],
      education: { institution: 'Imperial College London', degree: 'Computer Science', year: 2013 },
    },
    {
      firstName: 'Emma',
      lastName: 'Watson',
      email: 'emma.watson.dev@example.com',
      headline: 'Frontend Developer | Vue.js & Nuxt',
      summary: '5 years experienced Frontend Developer. Vue.js ecosystem expert. Strong focus on performance and accessibility. Design system advocate.',
      location: 'Manchester, UK',
      expectedSalary: 65000,
      skills: ['Vue.js', 'Nuxt', 'TypeScript', 'JavaScript', 'SCSS', 'Storybook', 'Jest', 'Accessibility'],
      experience: [
        { company: 'The Hut Group', title: 'Senior Frontend Developer', years: 2 },
        { company: 'BBC', title: 'Frontend Developer', years: 3 },
      ],
      education: { institution: 'University of Manchester', degree: 'Computer Science', year: 2018 },
    },
    {
      firstName: 'Oliver',
      lastName: 'Brown',
      email: 'oliver.brown@example.com',
      headline: 'Cloud Architect | GCP & Multi-Cloud',
      summary: '8 years in cloud infrastructure. GCP certified architect. Expertise in multi-cloud strategies, cost optimization, and cloud-native development.',
      location: 'Edinburgh, UK',
      expectedSalary: 95000,
      skills: ['GCP', 'AWS', 'Terraform', 'Kubernetes', 'Cloud Architecture', 'Cost Optimization', 'Security'],
      experience: [
        { company: 'Skyscanner', title: 'Principal Cloud Architect', years: 3 },
        { company: 'FanDuel', title: 'Cloud Engineer', years: 5 },
      ],
      education: { institution: 'University of Edinburgh', degree: 'Computer Science', year: 2015 },
    },
  ];

  const skillLevelMap: Record<string, 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'> = {
    'React': 'EXPERT',
    'TypeScript': 'ADVANCED',
    'JavaScript': 'EXPERT',
    'Python': 'ADVANCED',
    'Java': 'EXPERT',
    'Node.js': 'ADVANCED',
    'Docker': 'INTERMEDIATE',
    'Kubernetes': 'INTERMEDIATE',
    'AWS': 'ADVANCED',
    'GCP': 'ADVANCED',
    'PostgreSQL': 'ADVANCED',
    'MongoDB': 'INTERMEDIATE',
  };

  for (const profile of candidateProfiles) {
    // Create user
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {},
      create: {
        email: profile.email,
        passwordHash,
        firstName: profile.firstName,
        lastName: profile.lastName,
        type: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: randomInt(0, 1) === 1,
        phone: profile.location.includes('UK') ? '+4477009' + randomInt(10000, 99999) : '+905' + randomInt(300000000, 599999999),
      },
    });

    // Create candidate profile
    const candidate = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: profile.headline,
        summary: profile.summary,
        location: profile.location,
        expectedSalary: profile.expectedSalary,
        salaryCurrency: profile.location.includes('UK') ? 'GBP' : 'TRY',
        openToWork: true,
        openToRemote: randomInt(0, 1) === 1,
      },
      create: {
        userId: user.id,
        headline: profile.headline,
        summary: profile.summary,
        location: profile.location,
        expectedSalary: profile.expectedSalary,
        salaryCurrency: profile.location.includes('UK') ? 'GBP' : 'TRY',
        openToWork: true,
        openToRemote: randomInt(0, 1) === 1,
      },
    });

    // Add skills
    for (const skill of profile.skills) {
      const level = skillLevelMap[skill] || (['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][randomInt(1, 3)] as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT');
      await prisma.candidateSkill.upsert({
        where: { candidateId_name: { candidateId: candidate.id, name: skill } },
        update: { level, yearsOfExperience: randomInt(1, 8) },
        create: {
          candidateId: candidate.id,
          name: skill,
          level,
          yearsOfExperience: randomInt(1, 8),
        },
      });
    }

    // Add education - check if exists first
    const existingEdu = await prisma.education.findFirst({
      where: { candidateId: candidate.id, institution: profile.education.institution },
    });
    if (!existingEdu) {
      await prisma.education.create({
        data: {
          candidateId: candidate.id,
          institution: profile.education.institution,
          degree: profile.education.degree,
          fieldOfStudy: profile.education.degree,
          endDate: new Date(`${profile.education.year}-06-01`),
        },
      });
    }

    // Add work experience - check if exists first
    const existingExp = await prisma.workExperience.findFirst({
      where: { candidateId: candidate.id },
    });
    if (!existingExp) {
      let startYear = new Date().getFullYear();
      for (const exp of profile.experience) {
        const endYear = startYear;
        startYear = startYear - exp.years;
        await prisma.workExperience.create({
          data: {
            candidateId: candidate.id,
            company: exp.company,
            title: exp.title,
            startDate: new Date(`${startYear}-01-01`),
            endDate: exp === profile.experience[0] ? null : new Date(`${endYear}-01-01`),
            current: exp === profile.experience[0],
            description: `Worked as ${exp.title} at ${exp.company} for ${exp.years} years.`,
          },
        });
      }
    }

    // Add languages
    const lang1 = profile.location.includes('UK') ? 'English' : 'Türkçe';
    const lang2 = profile.location.includes('UK') ? 'Turkish' : 'English';
    await prisma.candidateLanguage.upsert({
      where: { candidateId_language: { candidateId: candidate.id, language: lang1 } },
      update: {},
      create: {
        candidateId: candidate.id,
        language: lang1,
        proficiency: 'NATIVE',
      },
    });
    await prisma.candidateLanguage.upsert({
      where: { candidateId_language: { candidateId: candidate.id, language: lang2 } },
      update: {},
      create: {
        candidateId: candidate.id,
        language: lang2,
        proficiency: 'FLUENT',
      },
    });

    console.log(`  ✓ Created candidate: ${profile.firstName} ${profile.lastName}`);
  }

  console.log(`  ✓ Created ${candidateProfiles.length} candidates with profiles`);
}

// ============ CREATE JOBS ============
async function seedJobs() {
  console.log('\n💼 Seeding jobs...');

  // Get some employers (create if needed)
  const passwordHash = await bcrypt.hash('Test1234', 12);

  const employers = [
    { firstName: 'Tech', lastName: 'Startup', email: 'hr@techstartup.com', company: 'Tech Startup Ltd' },
    { firstName: 'Digital', lastName: 'Agency', email: 'jobs@digitalagency.io', company: 'Digital Agency' },
    { firstName: 'Fintech', lastName: 'Corp', email: 'careers@fintechcorp.com', company: 'Fintech Corp' },
    { firstName: 'E-Commerce', lastName: 'Platform', email: 'hr@ecommerce.com', company: 'E-Commerce Platform' },
    { firstName: 'Software', lastName: 'House', email: 'jobs@softwarehouse.co.uk', company: 'Software House' },
  ];

  const employerIds: string[] = [];
  for (const emp of employers) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        passwordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        type: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    employerIds.push(user.id);
  }

  const jobListings = [
    {
      title: 'Senior Frontend Developer',
      description: 'We are looking for an experienced Frontend Developer to join our growing team. You will be responsible for building and maintaining our web applications using React and TypeScript.',
      requirements: '5+ years of experience with React, TypeScript, and modern frontend tooling. Strong understanding of CSS, responsive design, and accessibility standards.',
      responsibilities: 'Lead frontend development initiatives, mentor junior developers, collaborate with design and backend teams, implement new features and improve existing codebase.',
      location: 'London, UK',
      locationType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'SENIOR' as const,
      salaryMin: 70000,
      salaryMax: 90000,
      skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS', 'GraphQL'],
      benefits: ['Remote work options', 'Health insurance', 'Stock options', '25 days holiday', 'Learning budget'],
      category: 'Engineering',
    },
    {
      title: 'Backend Developer (Node.js)',
      description: 'Join our backend team to build scalable APIs and microservices. We use Node.js, PostgreSQL, and AWS for our infrastructure.',
      requirements: '3+ years of experience with Node.js, Express or NestJS, PostgreSQL, and RESTful API design.',
      responsibilities: 'Design and implement APIs, optimize database queries, deploy and monitor services, participate in code reviews.',
      location: 'Manchester, UK',
      locationType: 'REMOTE' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 50000,
      salaryMax: 70000,
      skills: ['Node.js', 'NestJS', 'PostgreSQL', 'Docker', 'AWS'],
      benefits: ['Fully remote', 'Flexible hours', 'Pension scheme', 'Team retreats'],
      category: 'Engineering',
    },
    {
      title: 'Full Stack Developer',
      description: 'Looking for a versatile developer comfortable with both frontend and backend development. Join our product team to build innovative solutions.',
      requirements: '4+ years of full stack experience, proficiency in React and Node.js, experience with cloud platforms.',
      responsibilities: 'End-to-end feature development, system design, API integration, performance optimization.',
      location: 'Edinburgh, UK',
      locationType: 'ONSITE' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 55000,
      salaryMax: 75000,
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
      benefits: ['Competitive salary', 'Equity package', 'Gym membership', 'Free lunch'],
      category: 'Engineering',
    },
    {
      title: 'DevOps Engineer',
      description: 'Help us build and maintain our cloud infrastructure. We are scaling rapidly and need someone to ensure our systems are reliable and secure.',
      requirements: 'Strong experience with AWS or GCP, Kubernetes, CI/CD pipelines, and infrastructure as code.',
      responsibilities: 'Manage cloud infrastructure, implement CI/CD, monitor system health, improve deployment processes.',
      location: 'London, UK',
      locationType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'SENIOR' as const,
      salaryMin: 80000,
      salaryMax: 100000,
      skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'CI/CD', 'Linux'],
      benefits: ['Remote-first culture', 'Conference budget', 'Private healthcare', 'Sabbatical option'],
      category: 'DevOps',
    },
    {
      title: 'Junior Frontend Developer',
      description: 'Great opportunity for a junior developer to grow their skills. You will work alongside senior developers and learn best practices.',
      requirements: '1+ years of experience with HTML, CSS, JavaScript. Familiarity with React is a plus.',
      responsibilities: 'Implement UI components, fix bugs, write tests, participate in code reviews.',
      location: 'Birmingham, UK',
      locationType: 'ONSITE' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'ENTRY' as const,
      salaryMin: 28000,
      salaryMax: 35000,
      skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git'],
      benefits: ['Mentorship program', 'Training budget', 'Flexible hours'],
      category: 'Engineering',
    },
    {
      title: 'UI/UX Designer',
      description: 'We need a creative designer to shape our product experience. You will work on both web and mobile interfaces.',
      requirements: '4+ years of UI/UX design experience, proficiency in Figma, portfolio showcasing web/mobile work.',
      responsibilities: 'Create wireframes and prototypes, conduct user research, design UI components, maintain design system.',
      location: 'London, UK',
      locationType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 50000,
      salaryMax: 70000,
      skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research', 'Design Systems'],
      benefits: ['Creative environment', 'Design conferences', 'Home office budget'],
      category: 'Design',
    },
    {
      title: 'Mobile Developer (React Native)',
      description: 'Build our cross-platform mobile app. We are looking for someone experienced with React Native and mobile best practices.',
      requirements: '3+ years of mobile development experience, React Native expertise, published apps on App Store/Play Store.',
      responsibilities: 'Develop and maintain mobile apps, implement new features, optimize performance, work with backend team.',
      location: 'Remote, UK',
      locationType: 'REMOTE' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 55000,
      salaryMax: 75000,
      skills: ['React Native', 'TypeScript', 'iOS', 'Android', 'Redux'],
      benefits: ['100% remote', 'Latest MacBook', 'Unlimited PTO', 'Home office stipend'],
      category: 'Engineering',
    },
    {
      title: 'Data Scientist',
      description: 'Join our data team to build ML models and derive insights from our data. Help shape our data-driven decisions.',
      requirements: 'MSc/PhD in relevant field, strong Python skills, experience with ML frameworks, SQL proficiency.',
      responsibilities: 'Build and deploy ML models, analyze data, create visualizations, collaborate with product team.',
      location: 'London, UK',
      locationType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 60000,
      salaryMax: 85000,
      skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Machine Learning', 'NLP'],
      benefits: ['Research time', 'Conference attendance', 'Competitive equity'],
      category: 'Data Science',
    },
    {
      title: 'QA Engineer',
      description: 'Ensure the quality of our products. You will design test strategies and implement automated testing.',
      requirements: '3+ years of QA experience, test automation skills, experience with Selenium or Cypress.',
      responsibilities: 'Create test plans, write automated tests, perform manual testing, report and track bugs.',
      location: 'Leeds, UK',
      locationType: 'ONSITE' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 40000,
      salaryMax: 55000,
      skills: ['Selenium', 'Cypress', 'Jest', 'Postman', 'Python', 'CI/CD'],
      benefits: ['Training opportunities', 'Team events', 'Cycle to work scheme'],
      category: 'Engineering',
    },
    {
      title: 'Product Manager',
      description: 'Lead our product development efforts. Work with engineering, design, and stakeholders to deliver value to users.',
      requirements: '5+ years of product management experience, tech background preferred, strong analytical skills.',
      responsibilities: 'Define product roadmap, prioritize features, conduct user research, work with cross-functional teams.',
      location: 'London, UK',
      locationType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'SENIOR' as const,
      salaryMin: 80000,
      salaryMax: 110000,
      skills: ['Product Strategy', 'Agile/Scrum', 'Data Analysis', 'User Research', 'Roadmapping'],
      benefits: ['Leadership role', 'Impact visibility', 'Generous equity', 'Executive coaching'],
      category: 'Product',
    },
    // Turkish job listings
    {
      title: 'Kıdemli Frontend Geliştirici',
      description: 'Büyüyen ekibimize deneyimli bir Frontend Developer arıyoruz. React ve TypeScript kullanarak web uygulamalarımızı geliştirmekten sorumlu olacaksınız.',
      requirements: 'React, TypeScript ve modern frontend araçlarıyla 5+ yıl deneyim. CSS, responsive tasarım ve erişilebilirlik standartlarına güçlü hakimiyet.',
      responsibilities: 'Frontend geliştirme inisiyatiflerine liderlik etmek, junior developerları mentorluk yapmak, tasarım ve backend ekipleriyle işbirliği yapmak.',
      location: 'İstanbul, Türkiye',
      locationType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'SENIOR' as const,
      salaryMin: 40000,
      salaryMax: 60000,
      skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS'],
      benefits: ['Uzaktan çalışma', 'Özel sağlık sigortası', 'Yemek kartı', 'Eğitim bütçesi'],
      category: 'Mühendislik',
    },
    {
      title: 'Backend Developer (Java)',
      description: 'Fintech sektöründe çalışan ekibimize Java developer arıyoruz. Yüksek trafikli sistemler geliştirme deneyimi önemli.',
      requirements: 'Java, Spring Boot ile 4+ yıl deneyim. Mikroservis mimarisi ve veritabanı optimizasyonu bilgisi.',
      responsibilities: 'API geliştirme, sistem tasarımı, performans optimizasyonu, kod review.',
      location: 'Ankara, Türkiye',
      locationType: 'ONSITE' as const,
      employmentType: 'FULL_TIME' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 35000,
      salaryMax: 50000,
      skills: ['Java', 'Spring Boot', 'Microservices', 'PostgreSQL', 'Kafka'],
      benefits: ['Performans bonusu', 'Sağlık sigortası', 'Shuttle servisi'],
      category: 'Mühendislik',
    },
    {
      title: 'Part-time Content Writer',
      description: 'Looking for a talented content writer to create engaging blog posts and marketing copy. Flexible hours.',
      requirements: 'Excellent writing skills in English, portfolio of published work, SEO knowledge is a plus.',
      responsibilities: 'Write blog posts, create social media content, edit and proofread.',
      location: 'Remote',
      locationType: 'REMOTE' as const,
      employmentType: 'PART_TIME' as const,
      experienceLevel: 'ENTRY' as const,
      salaryMin: 15000,
      salaryMax: 25000,
      skills: ['Content Writing', 'SEO', 'Social Media', 'Copywriting'],
      benefits: ['Flexible schedule', 'Work from anywhere', 'Creative freedom'],
      category: 'Marketing',
    },
    {
      title: 'Freelance Graphic Designer',
      description: 'Need a creative designer for ongoing projects. Logo design, marketing materials, and branding work.',
      requirements: '3+ years of graphic design experience, proficiency in Adobe Creative Suite.',
      responsibilities: 'Create visual assets, design marketing materials, develop brand guidelines.',
      location: 'Remote',
      locationType: 'REMOTE' as const,
      employmentType: 'FREELANCE' as const,
      experienceLevel: 'MID' as const,
      salaryMin: 200,
      salaryMax: 400,
      skills: ['Photoshop', 'Illustrator', 'InDesign', 'Branding', 'Typography'],
      benefits: ['Project-based work', 'Creative control', 'Portfolio building'],
      category: 'Design',
    },
  ];

  for (let i = 0; i < jobListings.length; i++) {
    const job = jobListings[i];
    const employerId = employerIds[i % employerIds.length];

    await prisma.job.create({
      data: {
        employerId,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        location: job.location,
        locationType: job.locationType,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.location?.includes('Türkiye') ? 'TRY' : 'GBP',
        skills: job.skills,
        benefits: job.benefits,
        category: job.category,
        status: 'ACTIVE',
        viewCount: randomInt(10, 500),
        applicationDeadline: new Date(Date.now() + randomInt(14, 60) * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  ✓ Created job: ${job.title}`);
  }

  console.log(`  ✓ Created ${jobListings.length} job listings`);
}

// ============ CREATE QUOTE REQUESTS ============
async function seedQuoteRequests() {
  console.log('\n📋 Seeding quote requests...');

  // Get existing customers and providers
  const customers = await prisma.user.findMany({
    where: { type: 'CUSTOMER' },
    take: 10,
  });

  const providers = await prisma.provider.findMany({
    include: { services: { include: { service: true } } },
    take: 20,
  });

  if (customers.length === 0 || providers.length === 0) {
    console.log('  ⚠ No customers or providers found, skipping quote requests');
    return;
  }

  const quoteRequestsData = [
    {
      description: 'Need a deep clean for my 3-bedroom house. End of tenancy cleaning required. The property has 2 bathrooms and a kitchen that need extra attention.',
      serviceKey: 'cleaning',
      budget: 200,
      location: 'London, SW1A 1AA',
    },
    {
      description: 'Leaking tap in kitchen and bathroom. The kitchen tap has been dripping for a week. Also need to check the water pressure.',
      serviceKey: 'plumbing',
      budget: 150,
      location: 'Manchester, M1 1AE',
    },
    {
      description: 'Need to install new light fixtures in living room and bedroom. 4 ceiling lights and 2 wall sconces. All fixtures are ready.',
      serviceKey: 'electrical',
      budget: 300,
      location: 'Birmingham, B1 1AA',
    },
    {
      description: 'Moving from 2-bedroom flat to a house. Need help with packing, loading, transport, and unloading. About 3 miles distance.',
      serviceKey: 'moving',
      budget: 400,
      location: 'Leeds, LS1 1UR',
    },
    {
      description: 'Looking to repaint my living room and hallway. Approximately 50 sqm total. Walls are currently white, want to change to light grey.',
      serviceKey: 'painting',
      budget: 350,
      location: 'Bristol, BS1 1AA',
    },
    {
      description: 'Garden needs complete makeover. Overgrown lawn, weeds everywhere, hedges need trimming. About 100 sqm garden area.',
      serviceKey: 'gardening',
      budget: 250,
      location: 'Edinburgh, EH1 1AA',
    },
    {
      description: 'Need to assemble IKEA wardrobe and bed frame. Also a small desk. Have all the parts and instructions.',
      serviceKey: 'handyman',
      budget: 100,
      location: 'Cardiff, CF10 1AA',
    },
    {
      description: 'Washing machine stopped working. Makes grinding noise during spin cycle. Samsung model, about 3 years old.',
      serviceKey: 'appliance_repair',
      budget: 120,
      location: 'Glasgow, G1 1AA',
    },
    {
      description: 'AC unit not cooling properly. Blowing warm air. Central unit in a 2-storey house. Service needed urgently.',
      serviceKey: 'hvac',
      budget: 200,
      location: 'London, NW1 6XE',
    },
    {
      description: 'Locked out of my flat. Need someone to open the door without damaging it. 3rd floor apartment building.',
      serviceKey: 'locksmith',
      budget: 80,
      location: 'London, EC1A 1BB',
    },
    // Turkish quote requests
    {
      description: 'Taşınma sonrası derin temizlik gerekiyor. 3+1 daire, 120 metrekare. Mutfak dolapları dahil detaylı temizlik istiyorum.',
      serviceKey: 'cleaning',
      budget: 800,
      location: 'Kadıköy, İstanbul',
    },
    {
      description: 'Banyoda su kaçağı var. Alttaki dairede leke oluşmuş. Acil müdahale gerekiyor.',
      serviceKey: 'plumbing',
      budget: 500,
      location: 'Beşiktaş, İstanbul',
    },
    {
      description: 'Evdeki tüm prizlerin ve anahtarların değiştirilmesi gerekiyor. Toplam 25 adet. Yeni tasarım istiyorum.',
      serviceKey: 'electrical',
      budget: 1500,
      location: 'Şişli, İstanbul',
    },
    {
      description: 'Klima montajı yaptırmak istiyorum. 3 adet split klima, tüm odalar için. Dış ünite balkona yerleştirilecek.',
      serviceKey: 'hvac',
      budget: 2000,
      location: 'Ataşehir, İstanbul',
    },
    {
      description: 'Salon ve yatak odasının boyanması gerekiyor. Toplam 80 metrekare. Tavan ve duvarlar.',
      serviceKey: 'painting',
      budget: 3000,
      location: 'Maltepe, İstanbul',
    },
  ];

  const services = await prisma.service.findMany();
  const serviceMap = new Map(services.map(s => [s.key, s.id]));

  let createdCount = 0;
  for (const qr of quoteRequestsData) {
    const serviceId = serviceMap.get(qr.serviceKey);
    if (!serviceId) continue;

    // Find a provider that offers this service
    const matchingProvider = providers.find(p =>
      p.services.some(ps => ps.service.key === qr.serviceKey)
    );

    if (!matchingProvider) continue;

    const customer = customers[randomInt(0, customers.length - 1)];
    const location = ukLocations[randomInt(0, ukLocations.length - 1)];

    await prisma.quoteRequest.create({
      data: {
        customerId: customer.id,
        providerId: matchingProvider.id,
        serviceId,
        description: qr.description,
        location: qr.location,
        latitude: location.lat + randomDecimal(-0.05, 0.05),
        longitude: location.lng + randomDecimal(-0.05, 0.05),
        preferredDate: new Date(Date.now() + randomInt(1, 14) * 24 * 60 * 60 * 1000),
        budget: qr.budget,
        status: ['OPEN', 'OPEN', 'OPEN', 'QUOTED'][randomInt(0, 3)] as any,
        images: [],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdCount++;
    console.log(`  ✓ Created quote request: ${qr.serviceKey} - ${qr.location}`);
  }

  console.log(`  ✓ Created ${createdCount} quote requests`);
}

main()
  .then(() => seedCandidates())
  .then(() => seedJobs())
  .then(() => seedQuoteRequests())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
