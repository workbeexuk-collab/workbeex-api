import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create services
  const services = [
    { key: 'cleaning', slug: 'cleaning', icon: 'Sparkles', popular: true },
    { key: 'plumbing', slug: 'plumbing', icon: 'Wrench', popular: true },
    { key: 'electrical', slug: 'electrical', icon: 'Zap', popular: true },
    { key: 'moving', slug: 'moving', icon: 'Truck', popular: true },
    { key: 'painting', slug: 'painting', icon: 'Paintbrush', popular: true },
    { key: 'gardening', slug: 'gardening', icon: 'Leaf', popular: false },
    { key: 'handyman', slug: 'handyman', icon: 'Hammer', popular: true },
    { key: 'tutoring', slug: 'tutoring', icon: 'GraduationCap', popular: false },
    { key: 'photography', slug: 'photography', icon: 'Camera', popular: false },
    { key: 'personal_training', slug: 'personal-training', icon: 'Dumbbell', popular: false },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { key: service.key },
      update: {},
      create: {
        key: service.key,
        slug: service.slug,
        icon: service.icon,
        popular: service.popular,
        translations: {
          create: [
            { language: 'en', name: service.key.charAt(0).toUpperCase() + service.key.slice(1).replace('_', ' '), description: `Professional ${service.key} services` },
            { language: 'tr', name: getServiceNameTr(service.key), description: `Profesyonel ${service.key} hizmetleri` },
          ],
        },
      },
    });
  }

  console.log('Seeding completed!');
}

function getServiceNameTr(key: string): string {
  const translations: Record<string, string> = {
    cleaning: 'Temizlik',
    plumbing: 'Tesisat',
    electrical: 'Elektrik',
    moving: 'Nakliyat',
    painting: 'Boyacılık',
    gardening: 'Bahçıvanlık',
    handyman: 'Tadilat',
    tutoring: 'Özel Ders',
    photography: 'Fotoğrafçılık',
    personal_training: 'Kişisel Antrenör',
  };
  return translations[key] || key;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
