export type DemoMarket = "de" | "us";

export type DemoLeadStatus = "new" | "contacted" | "successful" | "unsuccessful";

export type DemoLead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  inquiryType: string;
  status: DemoLeadStatus;
  assignedUserId: string | null;
  notes: string;
  createdAt: string;
  address: string;
};

export type DemoTeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: "owner" | "member";
  status: "active" | "pending";
};

export type DemoSettings = {
  contactPerson: string;
  companyEmail: string;
  notificationEmail: string;
  phone: string;
  websiteUrl: string;
  timezone: string;
  businessHours: string;
  inquiryTypes: Array<{ id: string; name: string; active: boolean }>;
};

export type DemoState = {
  market: DemoMarket;
  companyName: string;
  leads: DemoLead[];
  team: DemoTeamMember[];
  billing: {
    hasSubscription: boolean;
    planLabel: string;
    nextInvoiceAt: string;
  };
  settings: DemoSettings;
  notifications: string[];
};
