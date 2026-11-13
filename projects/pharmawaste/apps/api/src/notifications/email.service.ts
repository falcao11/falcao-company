import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface AccountRequestEmailPayload {
  id: string;
  pharmacyName: string;
  nif?: string | null;
  licenseNumber?: string | null;
  contactName: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  createdAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendNewAccountRequestNotification(
    payload: AccountRequestEmailPayload,
  ): Promise<void> {
    const adminEmail =
      process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@falcaocompany.pt';
    const adminAppUrl = process.env.ADMIN_APP_URL || 'http://localhost:3001';
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom =
      process.env.SMTP_FROM || 'PharmaWaste <noreply@falcaocompany.pt>';

    const subject = `[PharmaWaste] Novo Pedido de Conta: ${payload.pharmacyName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #059669; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 18px;">Novo Pedido de Conta PharmaWaste</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Recebido em ${payload.createdAt.toLocaleString('pt-PT')}</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p><strong>Farmácia:</strong> ${payload.pharmacyName}</p>
          <p><strong>NIF:</strong> ${payload.nif || 'Não indicado'}</p>
          <p><strong>Alvará INFARMED:</strong> ${payload.licenseNumber || 'Não indicado'}</p>
          <p><strong>Responsável:</strong> ${payload.contactName}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Telefone:</strong> ${payload.phone || 'Não indicado'}</p>
          <p><strong>Observações:</strong> ${payload.notes || 'Sem observações'}</p>
          <div style="margin-top: 24px;">
            <a href="${adminAppUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600;">
              Abrir Painel Admin Falcão Company
            </a>
          </div>
        </div>
      </div>
    `;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.log(
        `[DEV EMAIL FALLBACK] Para: ${adminEmail} | Assunto: ${subject} | Farmácia: ${payload.pharmacyName} (${payload.email})`,
      );
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: adminEmail,
        replyTo: payload.email,
        subject,
        html,
      });

      this.logger.log(
        `Email de notificação enviado para ${adminEmail} (Pedido ${payload.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email SMTP para ${adminEmail}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
