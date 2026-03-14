const nodemailer = require("nodemailer");

// create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// send email function
const sendReminderEmail = async (email, subject, message) => {

  try {

    const mailOptions = {
      from: `"DueMind Reminder" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: message
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent:", info.response);

  } catch (error) {

    console.error("Email error:", error);

  }

};

module.exports = sendReminderEmail;