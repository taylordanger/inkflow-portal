import { DeliveryChannel } from '@/types/studio';

interface ConfirmationOptions {
  clientName: string;
  contactTarget: string; // email or phone
  studioName: string;
  artistName?: string;
  campaignLabel?: string;
  estimatedReplyTime?: string; // e.g., "24-48 hours"
}

/**
 * Send email confirmation using Resend
 * This is a server-side only function
 */
export async function sendEmailConfirmation(
  options: ConfirmationOptions
): Promise<{ success: boolean; error?: string }> {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env;

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn('Resend not configured. Skipping email confirmation.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: options.contactTarget,
        subject: `Tattoo Consultation Request Received - ${options.studioName}`,
        html: generateEmailHtml(options),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return { success: false, error: 'Failed to send confirmation email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Email confirmation error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}

/**
 * Send SMS confirmation using Twilio
 * This is a server-side only function
 */
export async function sendSmsConfirmation(
  options: ConfirmationOptions
): Promise<{ success: boolean; error?: string }> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } =
    process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn('Twilio not configured. Skipping SMS confirmation.');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const message = generateSmsMessage(options);

    const formData = new URLSearchParams();
    formData.append('From', TWILIO_FROM_NUMBER);
    formData.append('To', options.contactTarget);
    formData.append('Body', message);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
          ).toString('base64')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio API error:', error);
      return { success: false, error: 'Failed to send confirmation SMS' };
    }

    return { success: true };
  } catch (error) {
    console.error('SMS confirmation error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error sending SMS',
    };
  }
}

/**
 * Send confirmation via email or SMS
 * Automatically selects the appropriate method based on the channel
 */
export async function sendConfirmation(
  channel: DeliveryChannel,
  options: ConfirmationOptions
): Promise<{ success: boolean; error?: string }> {
  if (channel === 'Email') {
    return sendEmailConfirmation(options);
  } else if (channel === 'SMS') {
    return sendSmsConfirmation(options);
  } else {
    return { success: false, error: 'Unknown delivery channel' };
  }
}

/**
 * Generate HTML email body
 */
function generateEmailHtml(options: ConfirmationOptions): string {
  const estimatedReply = options.estimatedReplyTime || '24-48 hours';

  return `
    <div style="font-family: 'Crimson Text', Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #faf8f3; padding: 40px 20px;">
      <div style="background-color: #fff; padding: 30px; border: 2px solid #2a2a2a;">
        <h2 style="color: #2a2a2a; margin-top: 0; font-size: 24px;">
          Request Received! ✓
        </h2>
        
        <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
          Hi ${options.clientName},
        </p>
        
        <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
          We've received your tattoo consultation request at <strong>${options.studioName}</strong>.
          ${
            options.artistName
              ? ` You've requested to work with <strong>${options.artistName}</strong>.`
              : ''
          }
        </p>
        
        <div style="background-color: #f0ebe5; padding: 20px; margin: 20px 0; border-left: 4px solid #b8860b;">
          <p style="margin: 0; font-size: 16px; color: #2a2a2a;">
            <strong>What's next?</strong>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #4a4a4a;">
            Our team will review your request and get back to you within <strong>${estimatedReply}</strong>.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          If you have any questions or want to add more details, feel free to reply to this email.
        </p>
        
        <p style="font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          © ${new Date().getFullYear()} ${options.studioName}. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

/**
 * Generate SMS message body
 */
function generateSmsMessage(options: ConfirmationOptions): string {
  const estimatedReply = options.estimatedReplyTime || '24-48 hours';
  const artistText = options.artistName ? ` with ${options.artistName}` : '';

  return `Hi ${options.clientName}! We received your tattoo consultation request${artistText} at ${options.studioName}. We'll be in touch within ${estimatedReply}. Thanks!`;
}
