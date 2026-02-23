import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  send(payload: EmailPayload): Promise<void>;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: config.pass
      },
      secure: config.port === 465
    });
    this.from = config.from;
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to.join(", "),
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });
  }
}
