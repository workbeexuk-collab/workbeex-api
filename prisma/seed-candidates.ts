import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helpers
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function randBool(chance = 0.5): boolean {
  return Math.random() < chance;
}
function randomDate(yearStart: number, yearEnd: number): Date {
  const y = randInt(yearStart, yearEnd);
  const m = randInt(0, 11);
  return new Date(y, m, 1);
}

// --- Data pools ---

const ukHeadlines = [
  'Senior React Developer', 'Full Stack Engineer', 'PHP Developer', 'UI/UX Designer',
  'Data Analyst', 'Backend Developer', 'DevOps Engineer', 'Mobile App Developer',
  'Machine Learning Engineer', 'Cloud Architect', 'QA Engineer', 'Scrum Master',
  'Project Manager', 'Product Designer', 'Frontend Developer', 'Python Developer',
  'Java Developer', 'WordPress Developer', 'Security Analyst', 'Technical Lead',
];

const trHeadlines = [
  'Kıdemli React Geliştirici', 'Full Stack Mühendis', 'PHP Geliştirici', 'UI/UX Tasarımcı',
  'Veri Analisti', 'Backend Geliştirici', 'DevOps Mühendisi', 'Mobil Uygulama Geliştirici',
  'Makine Öğrenimi Mühendisi', 'Bulut Mimarı', 'QA Mühendisi', 'Scrum Master',
  'Proje Yöneticisi', 'Ürün Tasarımcısı', 'Frontend Geliştirici', 'Python Geliştirici',
  'Java Geliştirici', 'WordPress Geliştirici', 'Güvenlik Analisti', 'Teknik Lider',
];

const skills = [
  'React', 'TypeScript', 'Node.js', 'Python', 'PHP', 'Java', 'JavaScript',
  'Vue.js', 'Angular', 'Next.js', 'Docker', 'Kubernetes', 'AWS', 'GCP',
  'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Git',
  'Tailwind CSS', 'CSS', 'HTML', 'Flutter', 'Swift', 'Go', 'Rust',
  'C#', '.NET', 'Laravel', 'Django', 'Spring Boot', 'Figma', 'Jira',
  'CI/CD', 'Linux', 'Terraform', 'Elasticsearch', 'RabbitMQ', 'Kafka',
];

const skillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
const locationTypes = ['ONSITE', 'REMOTE', 'HYBRID'] as const;
const salaryPeriods = ['YEARLY', 'MONTHLY', 'HOURLY'] as const;

const ukLocations = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Liverpool',
  'Edinburgh', 'Glasgow', 'Cardiff', 'Newcastle', 'Sheffield', 'Nottingham',
  'Cambridge', 'Oxford', 'Brighton', 'Reading', 'Southampton', 'Belfast',
];

const trLocations = [
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana',
  'Konya', 'Gaziantep', 'Mersin', 'Kayseri', 'Eskişehir', 'Trabzon',
];

const ukCompanies = [
  'Barclays', 'HSBC', 'Tesco', 'BBC', 'Sky', 'Vodafone', 'BP',
  'Unilever', 'Rolls-Royce', 'BAE Systems', 'Deliveroo', 'Monzo',
  'Revolut', 'Wise', 'Checkout.com', 'Improbable', 'Darktrace',
  'Arm Holdings', 'Sage Group', 'Ocado Technology', 'THG',
  'Starling Bank', 'GoCardless', 'Bulb Energy', 'Cazoo',
];

const trCompanies = [
  'Trendyol', 'Hepsiburada', 'Getir', 'Peak Games', 'Insider',
  'Yemeksepeti', 'Sahibinden', 'Turkcell', 'Garanti BBVA', 'İşbank',
  'Aselsan', 'Logo Yazılım', 'Softtech', 'Obss', 'Etiya',
  'N11', 'GittiGidiyor', 'Param', 'Papara', 'Iyzico',
];

const ukUniversities = [
  'University of Oxford', 'University of Cambridge', 'Imperial College London',
  'UCL', 'University of Edinburgh', 'King\'s College London',
  'University of Manchester', 'University of Bristol', 'University of Warwick',
  'University of Leeds', 'University of Birmingham', 'University of Glasgow',
  'University of Sheffield', 'University of Nottingham', 'University of Southampton',
];

const trUniversities = [
  'Boğaziçi Üniversitesi', 'ODTÜ', 'İTÜ', 'Sabancı Üniversitesi',
  'Koç Üniversitesi', 'Bilkent Üniversitesi', 'Hacettepe Üniversitesi',
  'Yıldız Teknik Üniversitesi', 'Ege Üniversitesi', 'Dokuz Eylül Üniversitesi',
  'Ankara Üniversitesi', 'İstanbul Üniversitesi', 'Marmara Üniversitesi',
];

const degrees = ["Bachelor's", "Master's", 'PhD', 'BSc', 'MSc', 'BA', 'MBA'];
const fields = [
  'Computer Science', 'Software Engineering', 'Information Technology',
  'Electrical Engineering', 'Mathematics', 'Data Science', 'Business Administration',
  'Computer Engineering', 'Physics', 'Mechanical Engineering',
];

const summaries = [
  'Passionate developer with a strong focus on building scalable web applications and delivering exceptional user experiences.',
  'Results-driven engineer with experience across the full software development lifecycle.',
  'Creative problem solver who thrives in fast-paced environments and enjoys tackling complex technical challenges.',
  'Detail-oriented professional with a track record of delivering high-quality software on time.',
  'Enthusiastic technologist always looking to learn new tools and frameworks to stay ahead of the curve.',
  'Experienced team player who values collaboration, code quality, and continuous improvement.',
  'Self-motivated developer with a keen interest in performance optimization and clean architecture.',
  'Adaptive engineer comfortable working with both legacy systems and cutting-edge technologies.',
];

async function main() {
  console.log('Fetching UK customers...');
  const ukUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'uk.customer.' } },
    select: { id: true, email: true },
    take: 100,
    orderBy: { email: 'asc' },
  });

  console.log('Fetching TR customers...');
  const trUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'tr.customer.' } },
    select: { id: true, email: true },
    take: 100,
    orderBy: { email: 'asc' },
  });

  console.log(`Found ${ukUsers.length} UK users, ${trUsers.length} TR users`);

  // Check which already have candidate profiles
  const existingProfiles = await prisma.candidateProfile.findMany({
    where: { userId: { in: [...ukUsers, ...trUsers].map(u => u.id) } },
    select: { userId: true },
  });
  const existingSet = new Set(existingProfiles.map(p => p.userId));

  const ukToSeed = ukUsers.filter(u => !existingSet.has(u.id));
  const trToSeed = trUsers.filter(u => !existingSet.has(u.id));
  console.log(`Seeding ${ukToSeed.length} UK + ${trToSeed.length} TR candidate profiles (skipping ${existingSet.size} existing)`);

  let created = 0;

  for (const user of ukToSeed) {
    await createCandidate(user.id, 'UK');
    created++;
    if (created % 20 === 0) console.log(`  Created ${created} profiles...`);
  }
  for (const user of trToSeed) {
    await createCandidate(user.id, 'TR');
    created++;
    if (created % 20 === 0) console.log(`  Created ${created} profiles...`);
  }

  console.log(`Done! Created ${created} candidate profiles with skills, experience, and education.`);
}

async function createCandidate(userId: string, region: 'UK' | 'TR') {
  const isUK = region === 'UK';
  const headline = pick(isUK ? ukHeadlines : trHeadlines);
  const location = pick(isUK ? ukLocations : trLocations);
  const currency = isUK ? 'GBP' : 'TRY';
  const salaryRange = isUK ? [35000, 120000] : [200000, 1200000];
  const salary = randInt(salaryRange[0], salaryRange[1]);

  const profile = await prisma.candidateProfile.create({
    data: {
      userId,
      headline,
      summary: pick(summaries),
      phone: isUK ? `+44${randInt(7000000000, 7999999999)}` : `+90${randInt(5000000000, 5999999999)}`,
      location,
      linkedinUrl: randBool(0.6) ? `https://linkedin.com/in/${headline.toLowerCase().replace(/\s+/g, '-')}-${randInt(1000, 9999)}` : null,
      portfolioUrl: randBool(0.3) ? `https://portfolio-${randInt(1000, 9999)}.dev` : null,
      availableFrom: randBool(0.5) ? new Date(2026, randInt(2, 8), 1) : null,
      expectedSalary: salary,
      salaryCurrency: currency,
      salaryPeriod: pick([...salaryPeriods]),
      openToWork: randBool(0.75),
      openToRemote: randBool(0.6),
    },
  });

  // Skills (3-7)
  const selectedSkills = pickN(skills, 3, 7);
  for (const name of selectedSkills) {
    await prisma.candidateSkill.create({
      data: {
        candidateId: profile.id,
        name,
        level: pick([...skillLevels]),
        yearsOfExperience: randInt(1, 12),
      },
    });
  }

  // Work Experience (1-3)
  const expCount = randInt(1, 3);
  const companies = isUK ? ukCompanies : trCompanies;
  for (let i = 0; i < expCount; i++) {
    const isCurrent = i === 0 && randBool(0.6);
    const startYear = randInt(2016, 2024);
    await prisma.workExperience.create({
      data: {
        candidateId: profile.id,
        company: pick(companies),
        title: pick(isUK ? ukHeadlines : trHeadlines),
        location: pick(isUK ? ukLocations : trLocations),
        locationType: pick([...locationTypes]),
        startDate: new Date(startYear, randInt(0, 11), 1),
        endDate: isCurrent ? null : new Date(randInt(startYear + 1, 2025), randInt(0, 11), 1),
        current: isCurrent,
        description: `Worked on various projects involving ${pickN(skills, 2, 3).join(', ')}. Contributed to team goals and delivered features on schedule.`,
        achievements: pickN([
          'Improved performance by 40%',
          'Led migration to microservices',
          'Mentored 3 junior developers',
          'Reduced CI/CD pipeline time by 60%',
          'Implemented real-time features',
          'Designed and built RESTful APIs',
          'Increased test coverage to 85%',
          'Delivered project 2 weeks ahead of schedule',
        ], 1, 3),
      },
    });
  }

  // Education (1-2)
  const eduCount = randInt(1, 2);
  const universities = isUK ? ukUniversities : trUniversities;
  for (let i = 0; i < eduCount; i++) {
    const startYear = randInt(2008, 2020);
    await prisma.education.create({
      data: {
        candidateId: profile.id,
        institution: pick(universities),
        degree: pick(degrees),
        fieldOfStudy: pick(fields),
        startDate: new Date(startYear, 8, 1),
        endDate: new Date(startYear + randInt(2, 4), 5, 1),
        current: false,
        grade: randBool(0.5) ? pick(['First Class', '2:1', '2:2', '3.5/4.0', '3.8/4.0', 'Distinction', 'Merit']) : null,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
