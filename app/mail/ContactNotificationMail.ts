import { Mailable } from '@tylix/mail';

interface ContactNotificationData {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

export class ContactNotificationMail extends Mailable {
    constructor(private payload: ContactNotificationData) {
        super();
    }

    build() {
        return {
            subject: `New website message: ${this.payload.subject}`,
            view: 'contact-notification',
            data: { ...this.payload },
        };
    }
}