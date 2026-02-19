import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,                              //Changed to 465 for secure: true
    service: process.env.SMTP_SERVICE,      // Note: Should be SMTP_SERVICE
    secure: true,
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASS,
    }
});

export default transporter;