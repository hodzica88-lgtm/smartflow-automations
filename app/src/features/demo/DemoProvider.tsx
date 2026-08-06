"use client";

import { createContext, useMemo, useState } from "react";

import { createDemoState } from "@/features/demo/data";
import type { DemoLeadStatus, DemoMarket, DemoState } from "@/features/demo/types";

type DemoContextValue = {
  state: DemoState;
  setLeadStatus: (leadId: string, status: DemoLeadStatus) => void;
  setLeadAssignee: (leadId: string, userId: string | null) => void;
  setLeadNotes: (leadId: string, notes: string) => void;
  inviteMember: (email: string) => void;
  removeMember: (memberId: string) => void;
  resendInvite: (memberId: string) => void;
  toggleBilling: () => void;
  updateSettings: (patch: Partial<DemoState["settings"]>) => void;
  addInquiryType: (name: string) => void;
  toggleInquiryType: (id: string) => void;
};

export const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({
  market,
  children,
}: {
  market: DemoMarket;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DemoState>(() => createDemoState(market));

  const value = useMemo<DemoContextValue>(() => ({
    state,
    setLeadStatus: (leadId, status) => {
      setState((prev) => ({
        ...prev,
        leads: prev.leads.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)),
      }));
    },
    setLeadAssignee: (leadId, userId) => {
      setState((prev) => ({
        ...prev,
        leads: prev.leads.map((lead) => (lead.id === leadId ? { ...lead, assignedUserId: userId } : lead)),
      }));
    },
    setLeadNotes: (leadId, notes) => {
      setState((prev) => ({
        ...prev,
        leads: prev.leads.map((lead) => (lead.id === leadId ? { ...lead, notes } : lead)),
      }));
    },
    inviteMember: (email) => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return;
      }

      setState((prev) => {
        const alreadyExists = prev.team.some((member) => member.email.toLowerCase() === cleanEmail);
        if (alreadyExists) {
          return prev;
        }

        const nextId = `tm-${prev.team.length + 1}`;
        return {
          ...prev,
          team: [
            ...prev.team,
            {
              id: nextId,
              fullName: cleanEmail.split("@")[0] ?? (prev.market === "us" ? "New member" : "Neues Teammitglied"),
              email: cleanEmail,
              role: "member",
              status: "pending",
            },
          ],
        };
      });
    },
    removeMember: (memberId) => {
      setState((prev) => ({
        ...prev,
        team: prev.team.filter((member) => member.id !== memberId || member.role === "owner"),
      }));
    },
    resendInvite: (memberId) => {
      setState((prev) => ({
        ...prev,
        notifications: [
          `${prev.market === "us" ? "Invite resent" : "Einladung erneut gesendet"}: ${memberId}`,
          ...prev.notifications,
        ].slice(0, 5),
      }));
    },
    toggleBilling: () => {
      setState((prev) => ({
        ...prev,
        billing: {
          ...prev.billing,
          hasSubscription: !prev.billing.hasSubscription,
        },
      }));
    },
    updateSettings: (patch) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...patch,
        },
      }));
    },
    addInquiryType: (name) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      setState((prev) => {
        const exists = prev.settings.inquiryTypes.some((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
          return prev;
        }

        return {
          ...prev,
          settings: {
            ...prev.settings,
            inquiryTypes: [
              ...prev.settings.inquiryTypes,
              {
                id: `it-${prev.settings.inquiryTypes.length + 1}`,
                name: trimmed,
                active: true,
              },
            ],
          },
        };
      });
    },
    toggleInquiryType: (id) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          inquiryTypes: prev.settings.inquiryTypes.map((entry) =>
            entry.id === id ? { ...entry, active: !entry.active } : entry,
          ),
        },
      }));
    },
  }), [state]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
