import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,           
    family: 4,              // force IPv4 — avoids the IPv6 hang on Render
    connectionTimeout: 10000, // fail in 10s instead of hanging forever
    greetingTimeout: 10000,
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASS,
    }
});

export default transporter;