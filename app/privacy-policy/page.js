import LegalDocument from "@/components/features/legal/LegalDocument";

export const metadata = {
  title: "Kebijakan Privasi · TanyaHukum",
  description: "Kebijakan Privasi TanyaHukum: data yang dikumpulkan, penggunaannya, pihak ketiga, cookie, dan hak Anda atas data pribadi.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocument type="privacy" />;
}
