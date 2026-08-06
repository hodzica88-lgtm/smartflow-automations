import type { DemoLead, DemoMarket, DemoState, DemoTeamMember } from "@/features/demo/types";

const DEMO_BASE_TIME = Date.parse("2026-08-06T12:00:00.000Z");
const minusHours = (h: number) => new Date(DEMO_BASE_TIME - h * 60 * 60 * 1000).toISOString();

const deLeads: DemoLead[] = [
  {
    id: "lead-de-1",
    firstName: "Anna",
    lastName: "Schulte",
    phone: "+49 171 2045566",
    email: "anna.schulte@example.com",
    inquiryType: "Dachreparatur",
    status: "new",
    assignedUserId: "tm-2",
    notes: "Sturmschaden, moeglichst kurzfristig Rueckruf.",
    createdAt: minusHours(2),
    address: "Hafenstrasse 8, 22303 Hamburg",
  },
  {
    id: "lead-de-2",
    firstName: "Bernd",
    lastName: "Lange",
    phone: "+49 170 9331450",
    email: "bernd.lange@example.com",
    inquiryType: "Flachdach Sanierung",
    status: "contacted",
    assignedUserId: "tm-3",
    notes: "Vor-Ort-Termin fuer Freitag vorgeschlagen.",
    createdAt: minusHours(18),
    address: "Bergweg 22, 23552 Luebeck",
  },
  {
    id: "lead-de-3",
    firstName: "Claudia",
    lastName: "Reiter",
    phone: "+49 175 7739981",
    email: "claudia.reiter@example.com",
    inquiryType: "Photovoltaik Vorbereitung",
    status: "successful",
    assignedUserId: "tm-2",
    notes: "Angebot bestaetigt, Start naechste Woche.",
    createdAt: minusHours(38),
    address: "Feldstrasse 4, 28195 Bremen",
  },
  {
    id: "lead-de-4",
    firstName: "David",
    lastName: "Krueger",
    phone: "+49 172 1155432",
    email: "david.krueger@example.com",
    inquiryType: "Dachfenster",
    status: "unsuccessful",
    assignedUserId: null,
    notes: "Kunde hat sich fuer regionalen Anbieter entschieden.",
    createdAt: minusHours(72),
    address: "Am Markt 2, 37073 Goettingen",
  },
];

const usLeads: DemoLead[] = [
  {
    id: "lead-us-1",
    firstName: "Olivia",
    lastName: "Baker",
    phone: "+1 720 555 0198",
    email: "olivia.baker@example.com",
    inquiryType: "Emergency roof repair",
    status: "new",
    assignedUserId: "tm-2",
    notes: "Leak after hail. Callback requested today.",
    createdAt: minusHours(3),
    address: "1450 W Cedar Ave, Denver, CO",
  },
  {
    id: "lead-us-2",
    firstName: "Ethan",
    lastName: "Wright",
    phone: "+1 303 555 0147",
    email: "ethan.wright@example.com",
    inquiryType: "Shingle replacement",
    status: "contacted",
    assignedUserId: "tm-3",
    notes: "On-site estimate booked for tomorrow.",
    createdAt: minusHours(20),
    address: "89 Brookside Ln, Aurora, CO",
  },
  {
    id: "lead-us-3",
    firstName: "Mia",
    lastName: "Parker",
    phone: "+1 720 555 0104",
    email: "mia.parker@example.com",
    inquiryType: "Solar-ready retrofit",
    status: "successful",
    assignedUserId: "tm-2",
    notes: "Proposal approved. Crew starts Monday.",
    createdAt: minusHours(44),
    address: "24 Oak Run, Lakewood, CO",
  },
  {
    id: "lead-us-4",
    firstName: "Noah",
    lastName: "Cole",
    phone: "+1 970 555 0162",
    email: "noah.cole@example.com",
    inquiryType: "Gutter cleanup",
    status: "unsuccessful",
    assignedUserId: null,
    notes: "Customer paused project for next season.",
    createdAt: minusHours(80),
    address: "11 Aspen Dr, Fort Collins, CO",
  },
];

const getTeam = (market: DemoMarket): DemoTeamMember[] => {
  if (market === "us") {
    return [
      { id: "tm-1", fullName: "Ava Smith", email: "ava@smithroofing.com", role: "owner", status: "active" },
      { id: "tm-2", fullName: "Liam Foster", email: "liam@smithroofing.com", role: "member", status: "active" },
      { id: "tm-3", fullName: "Sophia Hill", email: "sophia@smithroofing.com", role: "member", status: "active" },
      { id: "tm-4", fullName: "Jack Hall", email: "jack.hall@example.com", role: "member", status: "pending" },
    ];
  }

  return [
    { id: "tm-1", fullName: "Jana Mueller", email: "jana@mueller-bedachungen.de", role: "owner", status: "active" },
    { id: "tm-2", fullName: "Tobias Neumann", email: "tobias@mueller-bedachungen.de", role: "member", status: "active" },
    { id: "tm-3", fullName: "Lea Richter", email: "lea@mueller-bedachungen.de", role: "member", status: "active" },
    { id: "tm-4", fullName: "Mara Wolf", email: "mara.wolf@example.com", role: "member", status: "pending" },
  ];
};

export const createDemoState = (market: DemoMarket): DemoState => {
  const companyName = market === "us" ? "Smith Roofing LLC" : "Müller Bedachungen GmbH";

  return {
    market,
    companyName,
    leads: market === "us" ? usLeads : deLeads,
    team: getTeam(market),
    billing: {
      hasSubscription: market === "us",
      planLabel: "Varnito Pro",
      nextInvoiceAt: new Date(DEMO_BASE_TIME + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    settings: {
      contactPerson: market === "us" ? "Ava Smith" : "Jana Mueller",
      companyEmail: market === "us" ? "office@smithroofing.com" : "kontakt@mueller-bedachungen.de",
      notificationEmail: market === "us" ? "ops@smithroofing.com" : "einsatz@mueller-bedachungen.de",
      phone: market === "us" ? "+1 303 555 0191" : "+49 40 123 88 77",
      websiteUrl: market === "us" ? "https://smithroofing.com" : "https://mueller-bedachungen.de",
      timezone: market === "us" ? "America/Denver" : "Europe/Berlin",
      businessHours: market === "us" ? "Mon-Fri 08:00-17:00" : "Mo-Fr 08:00-17:00",
      inquiryTypes: market === "us"
        ? [
            { id: "it-1", name: "Emergency repair", active: true },
            { id: "it-2", name: "Roof replacement", active: true },
            { id: "it-3", name: "Insurance inspection", active: true },
          ]
        : [
            { id: "it-1", name: "Dachreparatur", active: true },
            { id: "it-2", name: "Dachsanierung", active: true },
            { id: "it-3", name: "Photovoltaik", active: true },
          ],
    },
    notifications: market === "us"
      ? ["New inquiry assigned to Liam", "Team invite pending for Jack Hall"]
      : ["Neue Anfrage wurde Tobias zugewiesen", "Teameinladung fuer Mara Wolf ist offen"],
  };
};
