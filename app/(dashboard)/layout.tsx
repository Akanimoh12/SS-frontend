import { SandboxBanner } from "@/components/common/SandboxBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SandboxBanner />
      {children}
    </>
  );
}
