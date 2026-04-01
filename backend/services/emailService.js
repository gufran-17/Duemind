const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // ✅ FIXED
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
});

// connection check
transporter.verify((err, success) => {
  if (err) {
    console.log("❌ SMTP ERROR:", err);
  } else {
    console.log("✅ SMTP READY");
  }
});

const sendReminderEmail = async (to, subject, html, retry = 0) => {
  try {
    console.log("📤 Sending to:", to);

    const info = await transporter.sendMail({
      from: `"DueMind" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.response);

  } catch (error) {
    console.log("❌ Email failed:", error.message);

    if (retry < 2) {
      console.log("🔁 Retrying...");
      return sendReminderEmail(to, subject, html, retry + 1);
    }
  }
};

module.exports = sendReminderEmail;