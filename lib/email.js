// src/lib/email.js
// Contoh menggunakan Nodemailer — bisa diganti Resend / SendGrid sesuai kebutuhan
// Ini untuk fitur forgot-password dan reset-password

import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // port 465 = TLS langsung
  // Port 587: wajib upgrade STARTTLS — tolak kirim jika server/jaringan menurunkan
  // koneksi ke plaintext (melindungi kredensial SMTP & token reset password)
  requireTLS: smtpPort !== 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetPasswordEmail({ to, resetUrl }) {
  // 1. Validasi Input Dasar
  if (!to || !resetUrl) {
    throw new Error("Email penerima (to) dan resetUrl wajib diisi.");
  }

  try {
    // 2. Verifikasi Koneksi SMTP (Opsional, tapi bagus untuk debugging awal)
    // Di production yang sangat high-traffic, baris ini bisa dihapus untuk speed.
    await transporter.verify();

    // 3. Eksekusi Pengiriman

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'App'}" <${process.env.SMTP_FROM}>`,
      to,
      subject: 'Reset Password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Reset Password</h2>
          <p style="color: #555;">Kamu menerima email ini karena ada permintaan reset password untuk akunmu.</p>
          <p style="color: #555;">Klik tombol di bawah untuk melanjutkan. Link berlaku selama <strong>1 jam</strong>.</p>
          
          <a href="${resetUrl}"
            style="
              display: inline-block;
              margin: 16px 0;
              padding: 12px 24px;
              background: #2563eb;
              color: #ffffff;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
            "
          >
            Reset Password
          </a>

          <p style="color: #888; font-size: 13px; margin-top: 20px;">
            Jika kamu tidak merasa meminta reset password, abaikan email ini.
            Passwordmu tidak akan berubah.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #aaa; font-size: 11px;">
            Atau salin link berikut ke browser:<br/>
            <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </p>
        </div>
      `,
    });

    // 4. Logging untuk Development / Testing
    if (process.env.NODE_ENV !== 'production' || process.env.SMTP_HOST === 'smtp.ethereal.email') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("📩 Preview link: %s", previewUrl);
      }
    }

    return { success: true, messageId: info.messageId };

  } catch (error) {
    // 5. Error Handling & Logging
    console.error("❌ Error sending email:", error.message);
    
    // Kamu bisa integrasikan dengan tool seperti Sentry di sini:
    // Sentry.captureException(error);

    return { 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Gagal mengirim email' : error.message 
    };
  }
}