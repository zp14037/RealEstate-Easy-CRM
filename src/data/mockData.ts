import { ProjectLead, SecondaryLead } from '../types';

/**
 * Utility to format Date to YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date with offset in days or months
 */
export function getDateOffset(days = 0, months = 0): string {
  const d = new Date();
  if (months !== 0) {
    d.setMonth(d.getMonth() + months);
  }
  if (days !== 0) {
    d.setDate(d.getDate() + days);
  }
  return formatDate(d);
}

export function getTodayDateString(): string {
  return formatDate(new Date());
}

/**
 * Format currency in UAE Dirhams (AED)
 */
export function formatAED(amount: number): string {
  if (!amount && amount !== 0) return 'AED 0';
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate difference in days between target date and today
 * 0 = Today, negative = overdue, positive = future
 */
export function getDaysDiffFromToday(dateString: string): number {
  if (!dateString) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Clean phone number for tel: and WhatsApp API
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+]/g, '').replace('+', '');
}

export function getWhatsAppLink(phone: string, clientName: string, propertyContext: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const message = encodeURIComponent(
    `Hello ${clientName}, this is Xpotential Real Estate following up regarding ${propertyContext}. Would you be available for a brief call today?`
  );
  return `https://wa.me/${cleaned}?text=${message}`;
}

export const INITIAL_PROJECT_LEADS: ProjectLead[] = [
  {
    id: 'proj-1',
    projectName: 'Burj Crown Residences',
    developer: 'Emaar Properties',
    community: 'Downtown Dubai',
    unitDetails: '2BR Corner Unit, 1,380 sq.ft, Burj Khalifa View',
    propertyType: 'Apartment',
    handoverDetails: 'Ready / Q4 2026',
    visitedDate: getDateOffset(-5),
    ownerName: 'Tariq Al-Mansoor',
    contactNo: '+971 50 892 4110',
    callStatus: 'Follow-up',
    followUpDate: getTodayDateString(), // DUE TODAY
    notes: 'Requested updated payment plan and high-floor floorplans. Extremely interested in unit 2408.',
    budgetAED: 3400000,
    createdAt: getDateOffset(-10),
    updatedAt: getDateOffset(-1),
  },
  {
    id: 'proj-2',
    projectName: 'DAMAC Lagoons - Ibiza',
    developer: 'DAMAC Properties',
    community: 'DAMAC Lagoons',
    unitDetails: '4BR Townhouse, 2,280 sq.ft, Direct Lagoon Access',
    propertyType: 'Townhouse',
    handoverDetails: 'Q4 2026',
    visitedDate: getDateOffset(-12),
    ownerName: 'Elena Rostova',
    contactNo: '+971 55 431 9928',
    callStatus: 'Follow-up',
    followUpDate: getTodayDateString(), // DUE TODAY
    notes: 'Family moving from London. Needs 60/40 payment plan details and school distance information.',
    budgetAED: 2850000,
    createdAt: getDateOffset(-15),
    updatedAt: getDateOffset(-2),
  },
  {
    id: 'proj-3',
    projectName: 'Palm Beach Towers 3',
    developer: 'Nakheel',
    community: 'Palm Jumeirah',
    unitDetails: '3BR Waterfront Luxury + Maid, 2,450 sq.ft',
    propertyType: 'Apartment',
    handoverDetails: 'Q2 2027',
    visitedDate: getDateOffset(-20),
    ownerName: 'Vikram Malhotra',
    contactNo: '+971 52 778 3004',
    callStatus: 'Follow-up',
    followUpDate: getDateOffset(-1), // OVERDUE BY 1 DAY
    notes: 'Urgent: Waiting for private marina berth confirmation before transferring initial 10% token deposit.',
    budgetAED: 6200000,
    createdAt: getDateOffset(-22),
    updatedAt: getDateOffset(-3),
  },
  {
    id: 'proj-4',
    projectName: 'Sobha Hartland II - Waves Opulence',
    developer: 'Sobha Realty',
    community: 'MBR City',
    unitDetails: '1BR Duplex Suite, 920 sq.ft, Crystal Lagoon View',
    propertyType: 'Duplex',
    handoverDetails: 'Q3 2027',
    visitedDate: getDateOffset(-8),
    ownerName: 'Sarah Jenkins',
    contactNo: '+971 58 664 1290',
    callStatus: 'Contacted',
    followUpDate: getDateOffset(3), // IN 3 DAYS
    notes: 'Met at Dubai Property Expo. Looking for 8%+ net rental yield investment.',
    budgetAED: 1850000,
    createdAt: getDateOffset(-8),
    updatedAt: getDateOffset(-8),
  },
  {
    id: 'proj-5',
    projectName: 'Ellington Ocean House',
    developer: 'Ellington Properties',
    community: 'Palm Jumeirah',
    unitDetails: '5BR Signature Penthouse with Private Infinity Pool',
    propertyType: 'Penthouse',
    handoverDetails: 'Q1 2028',
    visitedDate: getDateOffset(-30),
    ownerName: 'Sheikh Mansoor Al-Nahyan',
    contactNo: '+971 50 119 8834',
    callStatus: 'Follow-up',
    followUpDate: getDateOffset(0, 4), // IN 4 MONTHS (requested feature case)
    notes: 'Advised client will be concluding international fund allocation in 4 months. Set exact re-engagement date.',
    budgetAED: 19500000,
    createdAt: getDateOffset(-30),
    updatedAt: getDateOffset(-10),
  },
  {
    id: 'proj-6',
    projectName: 'Dubai Creek Waters 2',
    developer: 'Emaar Properties',
    community: 'Dubai Creek Harbour',
    unitDetails: '2BR Island Living, 1,220 sq.ft',
    propertyType: 'Apartment',
    handoverDetails: 'Q1 2028',
    visitedDate: getDateOffset(-3),
    ownerName: 'Chen Wei',
    contactNo: '+971 56 339 5012',
    callStatus: 'New',
    followUpDate: getDateOffset(1), // TOMORROW
    notes: 'Inquired via digital brochure. Needs Chinese language agent follow-up.',
    budgetAED: 2400000,
    createdAt: getDateOffset(-3),
    updatedAt: getDateOffset(-3),
  },
  {
    id: 'proj-7',
    projectName: 'Meraas Bluewaters Bay',
    developer: 'Meraas',
    community: 'Bluewaters Island',
    unitDetails: '3BR Luxury View, 2,050 sq.ft',
    propertyType: 'Apartment',
    handoverDetails: 'Q4 2027',
    visitedDate: getDateOffset(-45),
    ownerName: 'Rashid Al-Kuwari',
    contactNo: '+971 50 900 1144',
    callStatus: 'Closed',
    followUpDate: getDateOffset(-10),
    notes: 'Deal closed! Booking contract executed and SPA issued.',
    budgetAED: 5900000,
    createdAt: getDateOffset(-45),
    updatedAt: getDateOffset(-10),
  },
  {
    id: 'proj-8',
    projectName: 'Danube Oceanz',
    developer: 'Danube Properties',
    community: 'Dubai Maritime City',
    unitDetails: 'Studio with Private Plunge Pool, 480 sq.ft',
    propertyType: 'Apartment',
    handoverDetails: 'Q2 2027',
    visitedDate: getDateOffset(-60),
    ownerName: 'Alexandre Dubois',
    contactNo: '+971 54 881 2940',
    callStatus: 'Not Interested',
    followUpDate: getDateOffset(-20),
    notes: 'Bought in Ras Al Khaimah Wynn casino area instead.',
    budgetAED: 1100000,
    createdAt: getDateOffset(-60),
    updatedAt: getDateOffset(-20),
  },
];

export const INITIAL_SECONDARY_LEADS: SecondaryLead[] = [
  {
    id: 'sec-1',
    name: 'Dr. Faisal Al-Zahrani',
    mobile: '+971 50 712 9901',
    property: 'Marina Gate 2, Dubai Marina (2BR High Floor)',
    clientType: 'Buyer',
    dateContacted: getDateOffset(-6),
    budget: 3600000,
    expectationRequirements: 'Ready 2BR, full Marina view, chiller-free, ROI focused. Has ready mortgage pre-approval from ENBD.',
    remarksStatus: 'Active Follow-up',
    followUpDate: getTodayDateString(), // DUE TODAY
    notes: 'Needs confirmation on viewing time today at 4:30 PM for unit 3204.',
    createdAt: getDateOffset(-10),
    updatedAt: getDateOffset(-1),
  },
  {
    id: 'sec-2',
    name: 'Karim & Nadine Boulos',
    mobile: '+971 55 901 8844',
    property: 'Sidra 1, Dubai Hills Estate (4BR Villa)',
    clientType: 'Seller',
    dateContacted: getDateOffset(-14),
    budget: 6800000,
    expectationRequirements: 'Wants to list exclusive seller mandate. Plot 5,100 sqft, upgraded private pool, single row.',
    remarksStatus: 'Viewing Scheduled',
    followUpDate: getTodayDateString(), // DUE TODAY
    notes: 'Send Form A agreement and schedule photographer for tomorrow morning.',
    createdAt: getDateOffset(-14),
    updatedAt: getDateOffset(-2),
  },
  {
    id: 'sec-3',
    name: 'Maximilian Vance',
    mobile: '+971 52 334 9182',
    property: 'Downtown Address Sky View (1BR Serviced)',
    clientType: 'Buyer',
    dateContacted: getDateOffset(-18),
    budget: 2950000,
    expectationRequirements: 'Cash buyer. Wants fully serviced, hotel pool access, guaranteed rental pool returns.',
    remarksStatus: 'Active Follow-up',
    followUpDate: getDateOffset(-2), // OVERDUE BY 2 DAYS
    notes: 'Urgent: Follow up on counter-offer from owner (AED 2.9M offered vs AED 3.0M asking).',
    createdAt: getDateOffset(-20),
    updatedAt: getDateOffset(-4),
  },
  {
    id: 'sec-4',
    name: 'Amira Benali',
    mobile: '+971 58 992 3456',
    property: 'Sobha Hartland Greens (2BR Garden Apartment)',
    clientType: 'Seller',
    dateContacted: getDateOffset(-4),
    budget: 2200000,
    expectationRequirements: 'Rented till November at AED 140k. Looking for quick cash investor exit.',
    remarksStatus: 'New Lead',
    followUpDate: getDateOffset(2), // IN 2 DAYS
    notes: 'Requested comparative market analysis (CMA) report.',
    createdAt: getDateOffset(-4),
    updatedAt: getDateOffset(-4),
  },
  {
    id: 'sec-5',
    name: 'Dmitry Voronov',
    mobile: '+971 56 123 7890',
    property: 'Emerald Palace Mansions, Palm Jumeirah',
    clientType: 'Buyer',
    dateContacted: getDateOffset(-25),
    budget: 32000000,
    expectationRequirements: 'Ultra-luxury beachfront trophy mansion with private beach access. Strict confidentiality requested.',
    remarksStatus: 'Active Follow-up',
    followUpDate: getDateOffset(0, 4), // IN 4 MONTHS (long-term VIP follow-up)
    notes: 'Client returns to Dubai in 4 months for winter season. Set reminder to prepare private VIP portfolio.',
    createdAt: getDateOffset(-25),
    updatedAt: getDateOffset(-10),
  },
  {
    id: 'sec-6',
    name: 'Hassan Al-Nuaimi',
    mobile: '+971 50 338 9012',
    property: 'The Springs 11 (Type 3E - 3BR + Study)',
    clientType: 'Seller',
    dateContacted: getDateOffset(-9),
    budget: 4100000,
    expectationRequirements: 'Vacant on transfer. Backing lake, freshly renovated bathrooms.',
    remarksStatus: 'Offer Submitted',
    followUpDate: getDateOffset(1), // TOMORROW
    notes: 'Buyer submitted formal AED 3.95M MOU offer. Presenting to Hassan tomorrow.',
    createdAt: getDateOffset(-9),
    updatedAt: getDateOffset(-2),
  },
  {
    id: 'sec-7',
    name: 'Oliver Greenwood',
    mobile: '+971 54 220 9811',
    property: 'Cayan Tower, Dubai Marina (1BR Twisting Tower)',
    clientType: 'Buyer',
    dateContacted: getDateOffset(-40),
    budget: 1650000,
    expectationRequirements: 'Holiday home rental permit potential.',
    remarksStatus: 'Deal Closed',
    followUpDate: getDateOffset(-15),
    notes: 'Transferred at Dubai Land Department (DLD) Trustee office.',
    createdAt: getDateOffset(-40),
    updatedAt: getDateOffset(-15),
  },
];

export const DUBAI_DEVELOPERS = [
  'Emaar Properties',
  'Nakheel',
  'DAMAC Properties',
  'Sobha Realty',
  'Meraas',
  'Ellington Properties',
  'Danube Properties',
  'Aldar',
  'Binghatti Developers',
  'Select Group',
  'Omniyat',
  'Deyaar',
  'Azizi Developments',
  'Other Developer',
];

export const DUBAI_COMMUNITIES = [
  'Downtown Dubai',
  'Palm Jumeirah',
  'Dubai Marina',
  'Dubai Hills Estate',
  'Dubai Creek Harbour',
  'Business Bay',
  'MBR City',
  'DAMAC Lagoons',
  'Bluewaters Island',
  'Jumeirah Beach Residence (JBR)',
  'Arabian Ranches',
  'Jumeirah Golf Estates',
  'Dubai Maritime City',
  'City Walk',
  'Ras Al Khor / Creek Beach',
  'Other Community',
];

export const CALL_STATUS_OPTIONS: { label: string; value: ProjectLead['callStatus']; color: string; bg: string }[] = [
  { label: 'New', value: 'New', color: 'text-sky-300', bg: 'bg-sky-500/15 border-sky-500/30' },
  { label: 'Contacted', value: 'Contacted', color: 'text-blue-300', bg: 'bg-blue-500/15 border-blue-500/30' },
  { label: 'Follow-up', value: 'Follow-up', color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/30' },
  { label: 'Not Interested', value: 'Not Interested', color: 'text-slate-400', bg: 'bg-slate-700/50 border-slate-600/40' },
  { label: 'Closed', value: 'Closed', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
];

export const SECONDARY_STATUS_OPTIONS: { label: string; value: SecondaryLead['remarksStatus']; color: string; bg: string }[] = [
  { label: 'New Lead', value: 'New Lead', color: 'text-sky-300', bg: 'bg-sky-500/15 border-sky-500/30' },
  { label: 'Active Follow-up', value: 'Active Follow-up', color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/30' },
  { label: 'Viewing Scheduled', value: 'Viewing Scheduled', color: 'text-indigo-300', bg: 'bg-indigo-500/15 border-indigo-500/30' },
  { label: 'Offer Submitted', value: 'Offer Submitted', color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/30' },
  { label: 'Under Negotiation', value: 'Under Negotiation', color: 'text-orange-300', bg: 'bg-orange-500/15 border-orange-500/30' },
  { label: 'Deal Closed', value: 'Deal Closed', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  { label: 'Not Interested', value: 'Not Interested', color: 'text-slate-400', bg: 'bg-slate-700/50 border-slate-600/40' },
  { label: 'Lost', value: 'Lost', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
];
