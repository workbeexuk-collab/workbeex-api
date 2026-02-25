import { PrismaClient, UserType, PriceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = bcrypt.hashSync('Test1234', 12);

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDec = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];

// ========== DATA POOLS ==========

const UK_CITIES = [
  { city: 'London', lat: 51.5074, lng: -0.1278, postcodes: ['SW1A 1AA','EC1A 1BB','W1A 0AX','NW1 6XE','SE1 7PB','E1 6AN','N1 9GU','WC2N 5DU'] },
  { city: 'Manchester', lat: 53.4808, lng: -2.2426, postcodes: ['M1 1AE','M2 5DB','M3 4LZ','M4 1HQ'] },
  { city: 'Birmingham', lat: 52.4862, lng: -1.8904, postcodes: ['B1 1AA','B2 4QA','B3 2NS'] },
  { city: 'Leeds', lat: 53.8008, lng: -1.5491, postcodes: ['LS1 1UR','LS2 7EW'] },
  { city: 'Liverpool', lat: 53.4084, lng: -2.9916, postcodes: ['L1 0AA','L2 2DP'] },
  { city: 'Bristol', lat: 51.4545, lng: -2.5879, postcodes: ['BS1 1AA','BS2 0DD'] },
  { city: 'Edinburgh', lat: 55.9533, lng: -3.1883, postcodes: ['EH1 1AA','EH2 2ER'] },
  { city: 'Glasgow', lat: 55.8642, lng: -4.2518, postcodes: ['G1 1AA','G2 1DY'] },
  { city: 'Cardiff', lat: 51.4816, lng: -3.1791, postcodes: ['CF10 1AA','CF11 9LL'] },
  { city: 'Oxford', lat: 51.7520, lng: -1.2577, postcodes: ['OX1 1AA','OX2 6GG'] },
  { city: 'Cambridge', lat: 52.2053, lng: 0.1218, postcodes: ['CB1 1AA','CB2 3QZ'] },
  { city: 'Brighton', lat: 50.8225, lng: -0.1372, postcodes: ['BN1 1AA','BN2 1TW'] },
  { city: 'Nottingham', lat: 52.9548, lng: -1.1581, postcodes: ['NG1 1AA','NG2 3AA'] },
  { city: 'Sheffield', lat: 53.3811, lng: -1.4701, postcodes: ['S1 1AA','S2 4SU'] },
  { city: 'Newcastle', lat: 54.9783, lng: -1.6178, postcodes: ['NE1 1AA','NE2 1XE'] },
];

const TR_CITIES = [
  { city: 'Istanbul', lat: 41.0082, lng: 28.9784, postcodes: ['34000','34100','34200','34300','34400','34500'] },
  { city: 'Ankara', lat: 39.9334, lng: 32.8597, postcodes: ['06000','06100','06200'] },
  { city: 'Izmir', lat: 38.4237, lng: 27.1428, postcodes: ['35000','35100','35200'] },
  { city: 'Antalya', lat: 36.8969, lng: 30.7133, postcodes: ['07000','07100'] },
  { city: 'Bursa', lat: 40.1885, lng: 29.0610, postcodes: ['16000','16100'] },
  { city: 'Adana', lat: 37.0000, lng: 35.3213, postcodes: ['01000','01100'] },
  { city: 'Konya', lat: 37.8746, lng: 32.4932, postcodes: ['42000','42100'] },
  { city: 'Gaziantep', lat: 37.0662, lng: 37.3833, postcodes: ['27000','27100'] },
  { city: 'Mersin', lat: 36.8121, lng: 34.6415, postcodes: ['33000','33100'] },
  { city: 'Eskisehir', lat: 39.7767, lng: 30.5206, postcodes: ['26000','26100'] },
];

const UK_FIRST = ['James','Oliver','Harry','Jack','George','William','Thomas','Charlie','Oscar','Henry','Emma','Olivia','Sophia','Amelia','Isabella','Mia','Charlotte','Grace','Lily','Emily','Mohammed','Ali','David','Daniel','Joseph','Samuel','Adam','Benjamin','Lucas','Ethan','Sarah','Jessica','Hannah','Laura','Rachel','Chloe','Rebecca','Amy','Katie','Sophie'];
const UK_LAST = ['Smith','Jones','Williams','Brown','Taylor','Davies','Wilson','Evans','Thomas','Johnson','Roberts','Robinson','Thompson','Wright','Walker','White','Edwards','Hughes','Green','Hall','Lewis','Harris','Clarke','Patel','Jackson','Wood','Turner','Martin','Cooper','Hill','Ward','Morris','Moore','Clark','Lee','King','Baker','Harrison','Morgan','Allen'];
const TR_FIRST = ['Mehmet','Ahmet','Mustafa','Ali','Hüseyin','Hasan','İbrahim','Yusuf','Emre','Burak','Fatma','Ayşe','Emine','Hatice','Zeynep','Elif','Merve','Büşra','Selin','Deniz','Cem','Kaan','Berk','Tolga','Serkan','Onur','Okan','Murat','Ufuk','Barış','Derya','Ezgi','Gizem','Pelin','Ece','Cansu','İrem','Naz','Defne','Yağmur'];
const TR_LAST = ['Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Koç','Kurt','Özkan','Şimşek','Polat','Erdoğan','Güneş','Aktaş','Aksoy','Korkmaz','Tekin','Bulut','Karataş','Coşkun','Acar'];

const SERVICES_EN = [
  { key: 'cleaning', slug: 'cleaning', icon: '🧹', name: 'Cleaning', desc: 'Professional home and office cleaning services' },
  { key: 'plumbing', slug: 'plumbing', icon: '🔧', name: 'Plumbing', desc: 'Plumbing repair and installation' },
  { key: 'electrical', slug: 'electrical', icon: '⚡', name: 'Electrical', desc: 'Electrical work and repairs' },
  { key: 'painting', slug: 'painting', icon: '🎨', name: 'Painting & Decorating', desc: 'Interior and exterior painting' },
  { key: 'gardening', slug: 'gardening', icon: '🌿', name: 'Gardening', desc: 'Garden maintenance and landscaping' },
  { key: 'moving', slug: 'moving', icon: '📦', name: 'Removals & Moving', desc: 'House and office removals' },
  { key: 'carpentry', slug: 'carpentry', icon: '🪚', name: 'Carpentry', desc: 'Woodwork and furniture assembly' },
  { key: 'locksmith', slug: 'locksmith', icon: '🔑', name: 'Locksmith', desc: 'Lock repair and key cutting' },
  { key: 'pest_control', slug: 'pest-control', icon: '🐛', name: 'Pest Control', desc: 'Pest removal and prevention' },
  { key: 'roofing', slug: 'roofing', icon: '🏠', name: 'Roofing', desc: 'Roof repair and installation' },
  { key: 'tiling', slug: 'tiling', icon: '🔲', name: 'Tiling', desc: 'Wall and floor tiling' },
  { key: 'appliance_repair', slug: 'appliance-repair', icon: '🔌', name: 'Appliance Repair', desc: 'Home appliance repair' },
  { key: 'handyman', slug: 'handyman', icon: '🛠️', name: 'Handyman', desc: 'General handyman services' },
  { key: 'photography', slug: 'photography', icon: '📷', name: 'Photography', desc: 'Professional photography' },
  { key: 'tutoring', slug: 'tutoring', icon: '📚', name: 'Tutoring', desc: 'Private tutoring and lessons' },
  { key: 'catering', slug: 'catering', icon: '🍽️', name: 'Catering', desc: 'Event catering services' },
  { key: 'web_development', slug: 'web-development', icon: '💻', name: 'Web Development', desc: 'Website design and development' },
  { key: 'accounting', slug: 'accounting', icon: '📊', name: 'Accounting', desc: 'Bookkeeping and accounting' },
  { key: 'personal_training', slug: 'personal-training', icon: '💪', name: 'Personal Training', desc: 'Fitness training' },
  { key: 'beauty', slug: 'beauty', icon: '💅', name: 'Beauty & Hair', desc: 'Beauty and hairdressing' },
  { key: 'car_mechanic', slug: 'car-mechanic', icon: '🚗', name: 'Car Mechanic', desc: 'Vehicle repair and servicing' },
  { key: 'hvac', slug: 'hvac', icon: '❄️', name: 'HVAC', desc: 'Heating and air conditioning' },
  { key: 'security', slug: 'security', icon: '🔒', name: 'Security', desc: 'Security guard and CCTV installation' },
  { key: 'dry_cleaning', slug: 'dry-cleaning', icon: '👔', name: 'Dry Cleaning', desc: 'Laundry and dry cleaning' },
  { key: 'dog_walking', slug: 'dog-walking', icon: '🐕', name: 'Dog Walking', desc: 'Pet care and dog walking' },
];

const TR_SERVICE_NAMES: Record<string, { name: string; desc: string }> = {
  cleaning: { name: 'Temizlik', desc: 'Profesyonel ev ve ofis temizliği' },
  plumbing: { name: 'Tesisatçı', desc: 'Tesisat tamiri ve kurulumu' },
  electrical: { name: 'Elektrikçi', desc: 'Elektrik işleri ve tamiri' },
  painting: { name: 'Boyacı', desc: 'İç ve dış cephe boyama' },
  gardening: { name: 'Bahçıvan', desc: 'Bahçe bakımı ve peyzaj' },
  moving: { name: 'Nakliyat', desc: 'Ev ve ofis taşıma' },
  carpentry: { name: 'Marangoz', desc: 'Ahşap işleri ve mobilya montajı' },
  locksmith: { name: 'Çilingir', desc: 'Kilit tamiri ve anahtar yapımı' },
  pest_control: { name: 'Haşere Kontrolü', desc: 'Haşere temizliği ve önleme' },
  roofing: { name: 'Çatıcı', desc: 'Çatı tamiri ve kurulumu' },
  tiling: { name: 'Fayansçı', desc: 'Duvar ve yer karosu döşeme' },
  appliance_repair: { name: 'Beyaz Eşya Tamiri', desc: 'Ev aletleri tamiri' },
  handyman: { name: 'Usta', desc: 'Genel tadilat hizmetleri' },
  photography: { name: 'Fotoğrafçı', desc: 'Profesyonel fotoğrafçılık' },
  tutoring: { name: 'Özel Ders', desc: 'Özel ders ve kurslar' },
  catering: { name: 'Catering', desc: 'Yemek organizasyonu' },
  web_development: { name: 'Web Geliştirme', desc: 'Web sitesi tasarım ve geliştirme' },
  accounting: { name: 'Muhasebe', desc: 'Muhasebe ve defter tutma' },
  personal_training: { name: 'Kişisel Antrenör', desc: 'Fitness eğitimi' },
  beauty: { name: 'Güzellik & Kuaför', desc: 'Güzellik ve kuaförlük' },
  car_mechanic: { name: 'Oto Tamirci', desc: 'Araç tamiri ve bakımı' },
  hvac: { name: 'Klima & Isıtma', desc: 'Isıtma ve soğutma sistemleri' },
  security: { name: 'Güvenlik', desc: 'Güvenlik ve kamera kurulumu' },
  dry_cleaning: { name: 'Kuru Temizleme', desc: 'Çamaşır ve kuru temizleme' },
  dog_walking: { name: 'Köpek Gezdirme', desc: 'Evcil hayvan bakımı' },
};

// Job data
const UK_JOBS = [
  { title: 'Senior Frontend Developer', cat: 'Engineering', loc: 'London, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 70000, salMax: 95000, skills: ['React','TypeScript','Next.js','TailwindCSS'] },
  { title: 'Backend Developer (Node.js)', cat: 'Engineering', loc: 'Manchester, UK', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 50000, salMax: 70000, skills: ['Node.js','NestJS','PostgreSQL','Docker'] },
  { title: 'Full Stack Developer', cat: 'Engineering', loc: 'Edinburgh, UK', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 55000, salMax: 75000, skills: ['React','Node.js','TypeScript','AWS'] },
  { title: 'DevOps Engineer', cat: 'DevOps', loc: 'London, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 80000, salMax: 105000, skills: ['AWS','Kubernetes','Terraform','Docker'] },
  { title: 'Junior Frontend Developer', cat: 'Engineering', loc: 'Birmingham, UK', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'ENTRY' as const, salMin: 28000, salMax: 38000, skills: ['JavaScript','React','HTML','CSS'] },
  { title: 'UI/UX Designer', cat: 'Design', loc: 'London, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 50000, salMax: 70000, skills: ['Figma','Prototyping','User Research'] },
  { title: 'Data Scientist', cat: 'Data Science', loc: 'Cambridge, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 75000, salMax: 100000, skills: ['Python','TensorFlow','SQL','Spark'] },
  { title: 'Product Manager', cat: 'Product', loc: 'London, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 70000, salMax: 95000, skills: ['Agile','Jira','Analytics','Strategy'] },
  { title: 'Mobile Developer (React Native)', cat: 'Engineering', loc: 'Bristol, UK', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 55000, salMax: 75000, skills: ['React Native','TypeScript','iOS','Android'] },
  { title: 'QA Engineer', cat: 'Engineering', loc: 'Leeds, UK', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 40000, salMax: 55000, skills: ['Selenium','Cypress','Jest','CI/CD'] },
  { title: 'Cloud Architect', cat: 'Engineering', loc: 'London, UK', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'LEAD' as const, salMin: 100000, salMax: 130000, skills: ['AWS','Azure','GCP','Microservices'] },
  { title: 'Machine Learning Engineer', cat: 'Data Science', loc: 'Oxford, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 80000, salMax: 110000, skills: ['Python','PyTorch','MLOps','NLP'] },
  { title: 'Security Engineer', cat: 'Engineering', loc: 'London, UK', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 75000, salMax: 100000, skills: ['Penetration Testing','SIEM','Cloud Security'] },
  { title: 'Technical Writer', cat: 'Content', loc: 'Remote, UK', type: 'REMOTE' as const, emp: 'CONTRACT' as const, exp: 'MID' as const, salMin: 35000, salMax: 50000, skills: ['Documentation','API Docs','Markdown'] },
  { title: 'Scrum Master', cat: 'Product', loc: 'Manchester, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 50000, salMax: 65000, skills: ['Scrum','Kanban','Jira','Facilitation'] },
  { title: 'Graphic Designer', cat: 'Design', loc: 'Brighton, UK', type: 'REMOTE' as const, emp: 'FREELANCE' as const, exp: 'MID' as const, salMin: 30000, salMax: 50000, skills: ['Photoshop','Illustrator','Branding'] },
  { title: 'Customer Support Manager', cat: 'Operations', loc: 'Glasgow, UK', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 35000, salMax: 45000, skills: ['Zendesk','Leadership','CRM'] },
  { title: 'Marketing Manager', cat: 'Marketing', loc: 'London, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 55000, salMax: 75000, skills: ['SEO','Google Ads','Content Strategy'] },
  { title: 'Blockchain Developer', cat: 'Engineering', loc: 'London, UK', type: 'REMOTE' as const, emp: 'CONTRACT' as const, exp: 'SENIOR' as const, salMin: 90000, salMax: 130000, skills: ['Solidity','Ethereum','Web3.js','DeFi'] },
  { title: 'iOS Developer', cat: 'Engineering', loc: 'London, UK', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 60000, salMax: 80000, skills: ['Swift','SwiftUI','Xcode','CoreData'] },
];

const TR_JOBS = [
  { title: 'Kıdemli Frontend Geliştirici', cat: 'Mühendislik', loc: 'Istanbul, Türkiye', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 45000, salMax: 70000, skills: ['React','TypeScript','Next.js'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Backend Geliştirici', cat: 'Mühendislik', loc: 'Ankara, Türkiye', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 35000, salMax: 55000, skills: ['Node.js','PostgreSQL','Docker'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Full Stack Geliştirici', cat: 'Mühendislik', loc: 'Izmir, Türkiye', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 30000, salMax: 50000, skills: ['React','Node.js','MongoDB'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Mobil Uygulama Geliştirici', cat: 'Mühendislik', loc: 'Istanbul, Türkiye', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 35000, salMax: 55000, skills: ['React Native','Flutter','Dart'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'DevOps Mühendisi', cat: 'DevOps', loc: 'Istanbul, Türkiye', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 50000, salMax: 80000, skills: ['AWS','Docker','Kubernetes','CI/CD'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Veri Bilimci', cat: 'Veri Bilimi', loc: 'Ankara, Türkiye', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 45000, salMax: 70000, skills: ['Python','TensorFlow','SQL'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'UI/UX Tasarımcı', cat: 'Tasarım', loc: 'Istanbul, Türkiye', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 25000, salMax: 45000, skills: ['Figma','Adobe XD','Prototyping'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Proje Yöneticisi', cat: 'Yönetim', loc: 'Istanbul, Türkiye', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 40000, salMax: 65000, skills: ['Agile','Scrum','Jira'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Siber Güvenlik Uzmanı', cat: 'Güvenlik', loc: 'Ankara, Türkiye', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'SENIOR' as const, salMin: 50000, salMax: 80000, skills: ['Penetration Testing','SIEM','Firewall'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Dijital Pazarlama Uzmanı', cat: 'Pazarlama', loc: 'Izmir, Türkiye', type: 'REMOTE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 20000, salMax: 35000, skills: ['SEO','Google Ads','Social Media'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Yazılım Test Mühendisi', cat: 'Mühendislik', loc: 'Istanbul, Türkiye', type: 'HYBRID' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 25000, salMax: 40000, skills: ['Selenium','Cypress','Jest'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Sistem Yöneticisi', cat: 'DevOps', loc: 'Ankara, Türkiye', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 30000, salMax: 45000, skills: ['Linux','Docker','Networking'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Muhasebeci', cat: 'Finans', loc: 'Istanbul, Türkiye', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 20000, salMax: 35000, skills: ['Excel','SAP','Luca'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'İnsan Kaynakları Uzmanı', cat: 'İK', loc: 'Bursa, Türkiye', type: 'ONSITE' as const, emp: 'FULL_TIME' as const, exp: 'MID' as const, salMin: 20000, salMax: 30000, skills: ['İşe Alım','Bordro','İK Yazılımı'], cur: 'TRY', period: 'MONTHLY' as const },
  { title: 'Grafik Tasarımcı', cat: 'Tasarım', loc: 'Antalya, Türkiye', type: 'REMOTE' as const, emp: 'FREELANCE' as const, exp: 'MID' as const, salMin: 15000, salMax: 30000, skills: ['Photoshop','Illustrator','InDesign'], cur: 'TRY', period: 'MONTHLY' as const },
];

const BIOS_EN = [
  'Experienced professional with over {y} years in the industry. Fully insured and DBS checked.',
  'Reliable and friendly service provider. {y}+ years experience. Free quotes available.',
  'Qualified and certified with {y} years of hands-on experience. Customer satisfaction guaranteed.',
  'Professional service with attention to detail. Serving the local area for {y} years.',
  'Trusted local expert with excellent reviews. {y} years of quality service delivery.',
];
const BIOS_TR = [
  '{y} yıllık tecrübeye sahip profesyonel hizmet sağlayıcı. Sigortalı ve garantili çalışma.',
  'Güvenilir ve deneyimli usta. {y} yılı aşkın sektör deneyimi. Ücretsiz keşif.',
  '{y} yıllık tecrübe ile kaliteli ve güvenilir hizmet. Müşteri memnuniyeti önceliğimiz.',
  'Profesyonel ekip ve modern ekipmanlarla {y} yıldır hizmetinizdeyiz.',
  'Yerel uzman, mükemmel referanslar. {y} yıllık kaliteli hizmet.',
];

const BENEFITS = ['Remote work options','Health insurance','25 days holiday','Learning budget','Stock options','Pension scheme','Gym membership','Free lunch','Flexible hours','Team retreats','Conference budget','Sabbatical option'];

const AVATAR_URLS = Array.from({ length: 100 }, (_, i) => `https://i.pravatar.cc/150?img=${i + 1}`);

async function main() {
  console.log('🚀 Starting mega seed...');

  // 1. Services
  console.log('📦 Creating services...');
  const serviceIds: Record<string, string> = {};
  for (const s of SERVICES_EN) {
    const svc = await prisma.service.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, slug: s.slug, icon: s.icon, popular: rand(0, 1) === 1, active: true, sortOrder: rand(1, 50) },
    });
    serviceIds[s.key] = svc.id;
    // EN translation
    await prisma.serviceTranslation.upsert({
      where: { serviceId_language: { serviceId: svc.id, language: 'en' } },
      update: {},
      create: { serviceId: svc.id, language: 'en', name: s.name, description: s.desc },
    });
    // TR translation
    const tr = TR_SERVICE_NAMES[s.key];
    if (tr) {
      await prisma.serviceTranslation.upsert({
        where: { serviceId_language: { serviceId: svc.id, language: 'tr' } },
        update: {},
        create: { serviceId: svc.id, language: 'tr', name: tr.name, description: tr.desc },
      });
    }
  }
  console.log(`  ✓ ${SERVICES_EN.length} services created`);

  // 2. Test accounts
  console.log('👤 Creating test accounts...');
  for (const acc of [
    { email: 'customer@example.com', first: 'Test', last: 'Customer', type: 'CUSTOMER' as UserType },
    { email: 'provider@example.com', first: 'Test', last: 'Provider', type: 'PROVIDER' as UserType },
    { email: 'admin@example.com', first: 'Test', last: 'Admin', type: 'ADMIN' as UserType },
  ]) {
    await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: { email: acc.email, passwordHash: hash, firstName: acc.first, lastName: acc.last, type: acc.type, status: 'ACTIVE', emailVerified: true },
    });
  }

  // 3. UK Providers (500)
  console.log('🇬🇧 Creating UK providers...');
  const serviceKeys = Object.keys(serviceIds);
  let providerCount = 0;

  for (let i = 0; i < 500; i++) {
    const loc = pick(UK_CITIES);
    const first = pick(UK_FIRST);
    const last = pick(UK_LAST);
    const email = `uk.provider.${i}@workbeex.test`;
    const years = rand(2, 20);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email, passwordHash: hash, firstName: first, lastName: last,
        type: 'PROVIDER', status: 'ACTIVE', emailVerified: true,
        phone: `+44${rand(7000000000, 7999999999)}`,
        postcode: pick(loc.postcodes),
        avatar: pick(AVATAR_URLS),
        preferredLanguage: 'en',
      },
    });

    const completedJobs = rand(10, 300);
    const reviewCount = Math.floor(completedJobs * randDec(0.2, 0.6));
    const rating = randDec(3.5, 5.0);

    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: pick(BIOS_EN).replace('{y}', String(years)),
        hourlyRate: randDec(15, 80),
        responseTime: pick([1, 2, 4, 8, 12, 24]),
        location: `${loc.city}, UK`,
        latitude: loc.lat + randDec(-0.05, 0.05),
        longitude: loc.lng + randDec(-0.05, 0.05),
        serviceRadius: rand(5, 50),
        verified: rand(0, 3) > 0, // 75% verified
        rating, reviewCount, completedJobs,
        trustScore: rand(50, 100),
        isOnline: rand(0, 2) > 0,
      },
    });

    // Assign 1-4 services
    const numServices = rand(1, 4);
    const assignedKeys = [...serviceKeys].sort(() => Math.random() - 0.5).slice(0, numServices);
    for (const sk of assignedKeys) {
      await prisma.providerService.upsert({
        where: { providerId_serviceId: { providerId: provider.id, serviceId: serviceIds[sk] } },
        update: {},
        create: { providerId: provider.id, serviceId: serviceIds[sk], price: randDec(20, 150), priceType: pick(['HOURLY', 'FIXED', 'QUOTE_BASED'] as PriceType[]) },
      });
    }

    providerCount++;
    if (providerCount % 100 === 0) console.log(`  ... ${providerCount} UK providers`);
  }

  // 4. TR Providers (500)
  console.log('🇹🇷 Creating TR providers...');
  for (let i = 0; i < 500; i++) {
    const loc = pick(TR_CITIES);
    const first = pick(TR_FIRST);
    const last = pick(TR_LAST);
    const email = `tr.provider.${i}@workbeex.test`;
    const years = rand(2, 20);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email, passwordHash: hash, firstName: first, lastName: last,
        type: 'PROVIDER', status: 'ACTIVE', emailVerified: true,
        phone: `+90${rand(5000000000, 5999999999)}`,
        postcode: pick(loc.postcodes),
        avatar: pick(AVATAR_URLS),
        preferredLanguage: 'tr',
      },
    });

    const completedJobs = rand(10, 300);
    const reviewCount = Math.floor(completedJobs * randDec(0.2, 0.6));
    const rating = randDec(3.5, 5.0);

    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: pick(BIOS_TR).replace('{y}', String(years)),
        hourlyRate: randDec(100, 500),
        responseTime: pick([1, 2, 4, 8, 12, 24]),
        location: `${loc.city}, Türkiye`,
        latitude: loc.lat + randDec(-0.05, 0.05),
        longitude: loc.lng + randDec(-0.05, 0.05),
        serviceRadius: rand(5, 50),
        verified: rand(0, 3) > 0,
        rating, reviewCount, completedJobs,
        trustScore: rand(50, 100),
        isOnline: rand(0, 2) > 0,
      },
    });

    const numServices = rand(1, 4);
    const assignedKeys = [...serviceKeys].sort(() => Math.random() - 0.5).slice(0, numServices);
    for (const sk of assignedKeys) {
      await prisma.providerService.upsert({
        where: { providerId_serviceId: { providerId: provider.id, serviceId: serviceIds[sk] } },
        update: {},
        create: { providerId: provider.id, serviceId: serviceIds[sk], price: randDec(200, 2000), priceType: pick(['HOURLY', 'FIXED', 'QUOTE_BASED'] as PriceType[]) },
      });
    }

    providerCount++;
    if (providerCount % 100 === 0) console.log(`  ... ${providerCount} total providers`);
  }

  // 5. UK Customers (300)
  console.log('👥 Creating UK customers...');
  for (let i = 0; i < 300; i++) {
    const loc = pick(UK_CITIES);
    await prisma.user.upsert({
      where: { email: `uk.customer.${i}@workbeex.test` },
      update: {},
      create: {
        email: `uk.customer.${i}@workbeex.test`, passwordHash: hash,
        firstName: pick(UK_FIRST), lastName: pick(UK_LAST),
        type: 'CUSTOMER', status: 'ACTIVE', emailVerified: true,
        phone: `+44${rand(7000000000, 7999999999)}`,
        postcode: pick(loc.postcodes),
        avatar: pick(AVATAR_URLS),
        preferredLanguage: 'en',
      },
    });
  }

  // 6. TR Customers (200)
  console.log('👥 Creating TR customers...');
  for (let i = 0; i < 200; i++) {
    const loc = pick(TR_CITIES);
    await prisma.user.upsert({
      where: { email: `tr.customer.${i}@workbeex.test` },
      update: {},
      create: {
        email: `tr.customer.${i}@workbeex.test`, passwordHash: hash,
        firstName: pick(TR_FIRST), lastName: pick(TR_LAST),
        type: 'CUSTOMER', status: 'ACTIVE', emailVerified: true,
        phone: `+90${rand(5000000000, 5999999999)}`,
        postcode: pick(loc.postcodes),
        avatar: pick(AVATAR_URLS),
        preferredLanguage: 'tr',
      },
    });
  }

  // 7. Employer accounts + Jobs
  console.log('💼 Creating jobs...');
  const ukEmployers: string[] = [];
  for (let i = 0; i < 10; i++) {
    const u = await prisma.user.upsert({
      where: { email: `uk.employer.${i}@workbeex.test` },
      update: {},
      create: {
        email: `uk.employer.${i}@workbeex.test`, passwordHash: hash,
        firstName: pick(UK_FIRST), lastName: pick(UK_LAST),
        type: 'CUSTOMER', status: 'ACTIVE', emailVerified: true,
        preferredLanguage: 'en',
      },
    });
    ukEmployers.push(u.id);
  }

  const trEmployers: string[] = [];
  for (let i = 0; i < 10; i++) {
    const u = await prisma.user.upsert({
      where: { email: `tr.employer.${i}@workbeex.test` },
      update: {},
      create: {
        email: `tr.employer.${i}@workbeex.test`, passwordHash: hash,
        firstName: pick(TR_FIRST), lastName: pick(TR_LAST),
        type: 'CUSTOMER', status: 'ACTIVE', emailVerified: true,
        preferredLanguage: 'tr',
      },
    });
    trEmployers.push(u.id);
  }

  // UK Jobs (many duplicates with variations)
  let jobCount = 0;
  for (let dup = 0; dup < 3; dup++) {
    for (const j of UK_JOBS) {
      const salaryOffset = rand(-5000, 10000);
      await prisma.job.create({
        data: {
          employerId: pick(ukEmployers),
          title: j.title,
          description: `We are looking for a talented ${j.title} to join our team. This is an excellent opportunity for growth.`,
          requirements: `Required skills: ${j.skills.join(', ')}. Strong communication skills and team player mindset.`,
          responsibilities: 'Collaborate with cross-functional teams, deliver high-quality work, and contribute to team success.',
          location: j.loc,
          locationType: j.type,
          employmentType: j.emp,
          experienceLevel: j.exp,
          salaryMin: j.salMin + salaryOffset,
          salaryMax: j.salMax + salaryOffset,
          salaryCurrency: 'GBP',
          salaryPeriod: 'YEARLY',
          skills: j.skills,
          benefits: [...BENEFITS].sort(() => Math.random() - 0.5).slice(0, rand(3, 6)),
          category: j.cat,
          status: 'ACTIVE',
          viewCount: rand(10, 500),
        },
      });
      jobCount++;
    }
  }

  // TR Jobs
  for (let dup = 0; dup < 3; dup++) {
    for (const j of TR_JOBS) {
      const salaryOffset = rand(-2000, 5000);
      await prisma.job.create({
        data: {
          employerId: pick(trEmployers),
          title: j.title,
          description: `${j.title} pozisyonu için yetenekli bir profesyonel arıyoruz. Gelişim fırsatı sunan bir ortam.`,
          requirements: `Gerekli yetenekler: ${j.skills.join(', ')}. İyi iletişim becerileri ve takım çalışmasına yatkınlık.`,
          responsibilities: 'Çapraz fonksiyonel ekiplerle işbirliği, kaliteli iş teslimi ve takım başarısına katkı.',
          location: j.loc,
          locationType: j.type,
          employmentType: j.emp,
          experienceLevel: j.exp,
          salaryMin: j.salMin + salaryOffset,
          salaryMax: j.salMax + salaryOffset,
          salaryCurrency: j.cur || 'TRY',
          salaryPeriod: j.period || 'MONTHLY',
          skills: j.skills,
          benefits: ['Yemek kartı', 'Özel sağlık sigortası', 'Esnek çalışma', 'Eğitim bütçesi', 'Uzaktan çalışma'].sort(() => Math.random() - 0.5).slice(0, rand(2, 4)),
          category: j.cat,
          status: 'ACTIVE',
          viewCount: rand(10, 500),
        },
      });
      jobCount++;
    }
  }
  console.log(`  ✓ ${jobCount} jobs created`);

  // 8. Platform stats
  console.log('📊 Updating platform stats...');
  await prisma.platformStats.upsert({
    where: { key: 'main' },
    update: { totalProviders: 1000, verifiedProviders: 750, totalJobs: jobCount, completedJobs: 15000, totalReviews: 8500, averageRating: 4.6, totalCustomers: 500 },
    create: { key: 'main', totalProviders: 1000, verifiedProviders: 750, totalJobs: jobCount, completedJobs: 15000, totalReviews: 8500, averageRating: 4.6, totalCustomers: 500 },
  });

  console.log('\n✅ Mega seed complete!');
  console.log(`  - 25 services (EN + TR translations)`);
  console.log(`  - 500 UK providers + 500 TR providers`);
  console.log(`  - 300 UK customers + 200 TR customers`);
  console.log(`  - ${jobCount} job listings (UK + TR)`);
  console.log(`  - 3 test accounts`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
