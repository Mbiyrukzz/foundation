import { ContactNotificationMail } from './ContactNotificationMail.js';

const NOTIFY_TO = process.env.CONTACT_NOTIFY_EMAIL ?? 'hello@ashmif.com';

// Mirrors the mail block in tylix.config.ts.
const mailConfig = {
    driver: process.env.MAIL_DRIVER || 'log',
    from: process.env.MAIL_FROM || 'noreply@example.com',
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT) || 587,
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    secure: process.env.MAIL_SECURE === 'true',
};

// Visitor text goes into HTML, so escape it before it reaches the template.
function esc(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function notifyContact(data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}) {
    const safe = {
        name: esc(data.name),
        email: esc(data.email),
        phone: esc(data.phone || 'not given'),
        subject: esc(data.subject),
        message: esc(data.message),
    };
    await new ContactNotificationMail(safe).send(NOTIFY_TO, mailConfig);
}