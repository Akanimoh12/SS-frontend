import { PrivacySettings } from "@/components/settings/PrivacySettings";

export default function PrivacySettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Privacy settings</h1>
      <PrivacySettings />
    </main>
  );
}
