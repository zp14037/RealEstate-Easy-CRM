export type CallStatus = 'New' | 'Contacted' | 'Follow-up' | 'Not Interested' | 'Closed';

export type PropertyType = 'Apartment' | 'Townhouse' | 'Villa' | 'Penthouse' | 'Duplex';

export type ClientType = 'Buyer' | 'Seller';

export type SecondaryStatus = 
  | 'New Lead'
  | 'Active Follow-up'
  | 'Viewing Scheduled'
  | 'Offer Submitted'
  | 'Under Negotiation'
  | 'Deal Closed'
  | 'Not Interested'
  | 'Lost';

export interface ProjectLead {
  id: string;
  projectName: string;
  developer: string;
  community: string;
  unitDetails: string;
  propertyType: PropertyType;
  handoverDetails: string;
  visitedDate: string; // YYYY-MM-DD
  ownerName: string;
  contactNo: string;
  callStatus: CallStatus;
  followUpDate: string; // YYYY-MM-DD
  followUpTime?: string; // HH:mm format, e.g. "10:00"
  notes?: string;
  budgetAED?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecondaryLead {
  id: string;
  name: string;
  mobile: string;
  property: string;
  clientType: ClientType;
  dateContacted: string; // YYYY-MM-DD
  budget: number; // in AED
  expectationRequirements: string;
  remarksStatus: SecondaryStatus;
  followUpDate: string; // YYYY-MM-DD
  followUpTime?: string; // HH:mm format, e.g. "10:00"
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'project_leads' | 'secondary_leads';

export interface ActionItem {
  id: string;
  sourceType: 'project' | 'secondary';
  leadId: string;
  clientName: string;
  contactNo: string;
  propertyName: string;
  subtitle: string; // e.g. "Emaar · Downtown Dubai" or "Buyer · Sidra Villa"
  details: string;
  status: string;
  followUpDate: string;
  followUpTime?: string; // HH:mm format
  notes?: string;
  budgetFormatted?: string;
  isOverdue: boolean;
  isToday: boolean;
  daysDifference: number; // 0 = today, negative = overdue, positive = future
  rawLead: ProjectLead | SecondaryLead;
}
