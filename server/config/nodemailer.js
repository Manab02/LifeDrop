import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: 'gmail', // This automatically configures the correct host and port
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASS,
    }
});

export default transporter;