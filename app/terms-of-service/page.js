import LegalDocument from "@/components/features/legal/LegalDocument";

export const metadata = {
  title: "Syarat dan Ketentuan · TanyaHukum",
  description: "Syarat dan Ketentuan Layanan TanyaHukum: penggunaan layanan, batasan informasi hukum AI, paket dan pembayaran, serta tanggung jawab pengguna.",
};

export default function TermsOfServicePage() {
  return <LegalDocument type="terms" />;
}
