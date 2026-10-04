export type CallStatus = 'New' | 'Contacted' | 'Hot' | 'Follow-up' | 'Under Negotiation' | 'Closed Won' | 'Closed Lost' | 'Closed' | 'Not Interested';

export type CustomTableStatus = 
  | 'New' 
  | 'Active' 
  | 'Hot' 
  | 'Follow-up' 
  | 'Interested' 
  | 'Under Negotiation' 
  | 'Closed Won' 
  | 'Closed Lost' 
  | 'Closed' 
  | 'Not Interested';

export type PropertyType = 'Apartment' | 'Townhouse' | 'Villa' | 'Penthouse' | 'Duplex';

export type ClientType = 'Buyer' | 'Seller';

export type SecondaryStatus = 
  | 'New Lead'
  | 'Active Follow-up'
  | 'Hot'
  | 'Viewing Scheduled'
  | 'Offer Submitted'
  | 'Under Negotiation'
  | 'Closed Won'
  | 'Closed Lost'
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

export interface CustomTableColumn {
  id: string;
  key: string;
  name: string;
  type: 'text' | 'number' | 'aed' | 'date' | 'tel' | 'select';
  options?: string[];
  isLeadValue?: boolean;
}

export interface CustomTable {
  id: string;
  name: string;
  description?: string;
  columns: CustomTableColumn[];
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomTableRow {
  id: string;
  tableId: string;
  data: Record<string, any>;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'project_leads' | 'secondary_leads' | string;

export interface ActionItem {
  id: string;
  sourceType: 'project' | 'secondary' | 'custom';
  leadId: string;
  clientName: string;
  contactNo: string;
  propertyName: string;
  subtitle: string; // e.g. "Table: XYZ" or "Emaar · Downtown Dubai"
  details: string;
  status: string;
  followUpDate: string;
  followUpTime?: string; // HH:mm format
  notes?: string;
  budgetFormatted?: string;
  isOverdue: boolean;
  isToday: boolean;
  daysDifference: number; // 0 = today, negative = overdue, positive = future
  rawLead: ProjectLead | SecondaryLead | CustomTableRow | any;
}
