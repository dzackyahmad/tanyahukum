import { Poppins } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import AnimatedBackground from "@/components/shared/AnimatedBackground";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "TanyaHukum",
  description: "AI Chatbot Hukum",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="antialiased" suppressHydrationWarning>
      <body className={`${poppins.className} bg-white dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 transition-colors duration-300`} suppressHydrationWarning>
        <ThemeProvider>
          {/* Prevent dark mode flash */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  if (localStorage.getItem('theme') === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              `,
            }}
          />
          <AnimatedBackground />

          {/* ⬇️ WAJIB DI DALAM BODY */}
          <Script
            src="https://app.sandbox.midtrans.com/snap/snap.js"
            data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
            strategy="afterInteractive"
          />

          <main className="relative z-10">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}