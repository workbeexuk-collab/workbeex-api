import * as nodemailer from 'nodemailer';

const code = Math.floor(100000 + Math.random() * 900000).toString();
console.log(`Code: ${code}`);

const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: '3ba7b90592e2a7',
    pass: '6a7434eaa04656',
  },
});

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:40px 40px 32px 40px;">
              <img src="https://res.cloudinary.com/dm3w1dqmg/image/upload/v1767882468/brand/nextbee/logo_primary.png" alt="NextBee" height="36" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:0 40px;">
              <h1 style="font-size:20px;font-weight:600;color:#1a1a1a;margin:0 0 12px 0;text-align:center;">
                Doğrulama Kodun
              </h1>
              <p style="font-size:15px;color:#666;margin:0 0 24px 0;text-align:center;line-height:1.5;">
                Telefon numaranı doğrulamak için aşağıdaki kodu gir
              </p>
            </td>
          </tr>

          <!-- Code -->
          <tr>
            <td align="center" style="padding:0 40px 24px 40px;">
              <div style="background:#f5f5f5;border-radius:8px;padding:20px 32px;display:inline-block;">
                <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1a1a1a;font-family:monospace;">${code}</span>
              </div>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <p style="font-size:13px;color:#999;margin:0;text-align:center;line-height:1.5;">
                Bu kod 10 dakika geçerli. Kodu kimseyle paylaşma.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#eee;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="font-size:12px;color:#999;margin:0;line-height:1.6;">
                Bu emaili sen istemediysen güvenle yoksayabilirsin.<br>
                © 2025 NextBee
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendEmail() {
  try {
    await transporter.sendMail({
      from: '"NextBee" <noreply@nextbee.co.uk>',
      to: 'emrullah.ayilmazdir@gmail.com',
      subject: `${code} - Doğrulama kodun`,
      html: emailHtml,
    });
    console.log('✅ Sent');
  } catch (error) {
    console.error('Failed:', error);
  }
}

sendEmail();
