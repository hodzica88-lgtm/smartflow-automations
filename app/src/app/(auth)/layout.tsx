import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <LegalFooter />
    </>
  );
}
