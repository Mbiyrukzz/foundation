declare module '@tylix/mail' {
  export interface MailContent {
    subject: string
    view: string
    data?: Record<string, unknown>
  }

  export abstract class Mailable {
    abstract build(): MailContent
    send(to: string, config?: unknown): Promise<unknown>
  }
}