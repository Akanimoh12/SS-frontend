import { CommandPalette } from "@/components/common/CommandPalette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandPalette />
      {children}
    </>
  );
}
