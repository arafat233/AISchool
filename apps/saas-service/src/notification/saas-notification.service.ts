import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";

type EventType =
  | "GO_LIVE"
  | "TRIAL_EXPIRY_WARNING"
  | "MONTHLY_INVOICE"
  | "PAYMENT_CONFIRMATION"
  | "SUSPENSION_NOTICE";

export interface NotificationContext {
  to: string;
  tenantId: string;
  eventType: EventType;
  vars: Record<string, string | number>;
}

const TEMPLATES: Record<EventType, { subject: string; body: string }> = {
  GO_LIVE: {
    subject: "🎉 {{school_name}} is now live on AISchool!",
    body: `Dear {{contact_name}},

Congratulations! Your school "{{school_name}}" has successfully completed onboarding and is now live on AISchool.

You are on the {{plan}} plan. Your dedicated school admin can log in at {{portal_url}}.

If you need any help, reach out to support@aischool.in.

Welcome aboard!
The AISchool Team`,
  },
  TRIAL_EXPIRY_WARNING: {
    subject: "⚠️ Your AISchool trial ends in {{days_left}} days",
    body: `Dear {{contact_name}},

Your 30-day free trial for "{{school_name}}" will expire on {{expiry_date}}.

To continue without interruption, please upgrade to one of our paid plans:
- BASIC: ₹55/student/month
- STANDARD: ₹110/student/month
- PREMIUM: ₹160/student/month
- ENTERPRISE: ₹200/student/month

Upgrade now at {{billing_url}}.

The AISchool Team`,
  },
  MONTHLY_INVOICE: {
    subject: "Invoice #{{invoice_number}} for {{month_year}} — ₹{{total_amount}}",
    body: `Dear {{contact_name}},

Your monthly invoice for {{school_name}} has been generated.

  Invoice #:   {{invoice_number}}
  Period:      {{month_year}}
  Students:    {{student_count}}
  Plan:        {{plan}}
  Base Amount: ₹{{base_amount}}
  GST (18%):   ₹{{gst_amount}}
  Total Due:   ₹{{total_amount}}
  Due Date:    {{due_date}}

Pay at {{billing_url}} before the due date to avoid service interruption.

The AISchool Team`,
  },
  PAYMENT_CONFIRMATION: {
    subject: "✅ Payment Confirmed — Invoice #{{invoice_number}}",
    body: `Dear {{contact_name}},

We have received your payment for invoice #{{invoice_number}}.

  Amount Paid:  ₹{{total_amount}}
  Method:       {{payment_method}}
  Txn Ref:      {{txn_ref}}
  Date:         {{payment_date}}

Thank you for your payment. Your account is active.

The AISchool Team`,
  },
  SUSPENSION_NOTICE: {
    subject: "🔴 Your AISchool account has been suspended",
    body: `Dear {{contact_name}},

Your AISchool account for "{{school_name}}" has been suspended.

Reason: {{reason}}

To reactivate your account, please contact billing@aischool.in or pay any outstanding invoices at {{billing_url}}.

The AISchool Team`,
  },
};

function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

@Injectable()
export class SaasNotificationService implements OnModuleInit {
  private readonly logger = new Logger(SaasNotificationService.name);
  private queue: Queue | null = null;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    try {
      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      this.queue = new Queue("queue-email", { connection });
      this.logger.log("SaasNotification queue connected");
    } catch (err) {
      this.logger.warn(`Could not connect to Redis — notifications will be logged only: ${err}`);
    }
  }

  async send(ctx: NotificationContext): Promise<void> {
    const tpl = TEMPLATES[ctx.eventType];
    if (!tpl) {
      this.logger.warn(`Unknown event type: ${ctx.eventType}`);
      return;
    }

    const subject = renderTemplate(tpl.subject, ctx.vars);
    const body = renderTemplate(tpl.body, ctx.vars);

    if (this.queue) {
      await this.queue.add(
        ctx.eventType,
        { to: ctx.to, subject, body, tenantId: ctx.tenantId, eventType: ctx.eventType },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
      );
    } else {
      this.logger.log(`[NOTIFY] To: ${ctx.to} | ${subject}`);
    }
  }
}
