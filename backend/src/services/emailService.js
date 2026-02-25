import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Create transporter from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@carindex.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Send alert email to user
 */
export async function sendAlertEmail(userEmail, alertName, listings) {
  try {
    if (!listings || listings.length === 0) {
      logger.warn('No listings to send in alert email', { userEmail, alertName });
      return;
    }

    const listingsHTML = listings.map(listing => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
        <div style="display: flex; gap: 16px;">
          ${listing.images && listing.images[0] ? `
            <img src="${listing.images[0]}" alt="${listing.brand} ${listing.model}" 
                 style="width: 150px; height: 100px; object-fit: cover; border-radius: 8px;" />
          ` : ''}
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #111827;">
              ${listing.year || ''} ${listing.brand || ''} ${listing.model || ''}
            </h3>
            <div style="color: #059669; font-size: 20px; font-weight: bold; margin-bottom: 8px;">
              ${listing.price ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(listing.price) : 'Prix sur demande'}
            </div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
              📍 ${listing.location_city || listing.location_region || ''}${listing.location_country ? ', ' + listing.location_country : ''}
            </div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
              🛣️ ${listing.mileage ? new Intl.NumberFormat('fr-FR').format(listing.mileage) + ' km' : 'Non renseigné'}
            </div>
            ${listing.market_price ? `
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                💰 Prix marché: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(listing.market_price)}
                ${listing.confidence_index ? ` (${listing.confidence_index}% confiance)` : ''}
              </div>
            ` : ''}
            <a href="${FRONTEND_URL}/#/listing/${listing.id}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 8px;">
              Voir les détails →
            </a>
          </div>
        </div>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nouvelles annonces - ${alertName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background: #f9fafb; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">C</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827;">Carindex</h1>
            </div>
            
            <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 16px;">
              🔔 Nouvelles annonces pour "${alertName}"
            </h2>
            
            <p style="color: #6b7280; margin-bottom: 24px;">
              Nous avons trouvé ${listings.length} nouvelle${listings.length > 1 ? 's' : ''} annonce${listings.length > 1 ? 's' : ''} correspondant à vos critères.
            </p>
            
            ${listingsHTML}
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <a href="${FRONTEND_URL}/#/dashboard" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Voir mon dashboard
              </a>
            </div>
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>Vous recevez cet email car vous avez créé une alerte sur Carindex.</p>
              <p><a href="${FRONTEND_URL}/#/dashboard" style="color: #2563eb;">Gérer mes alertes</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Carindex - Nouvelles annonces pour "${alertName}"

Nous avons trouvé ${listings.length} nouvelle${listings.length > 1 ? 's' : ''} annonce${listings.length > 1 ? 's' : ''} correspondant à vos critères.

${listings.map(listing => `
${listing.year || ''} ${listing.brand || ''} ${listing.model || ''}
Prix: ${listing.price ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(listing.price) : 'Prix sur demande'}
Kilométrage: ${listing.mileage ? new Intl.NumberFormat('fr-FR').format(listing.mileage) + ' km' : 'Non renseigné'}
Localisation: ${listing.location_city || listing.location_region || ''}${listing.location_country ? ', ' + listing.location_country : ''}
Voir: ${FRONTEND_URL}/#/listing/${listing.id}
`).join('\n---\n')}

Voir mon dashboard: ${FRONTEND_URL}/#/dashboard
    `.trim();

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: `🔔 ${listings.length} nouvelle${listings.length > 1 ? 's' : ''} annonce${listings.length > 1 ? 's' : ''} - ${alertName}`,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Alert email sent successfully', { 
      userEmail, 
      alertName, 
      listingsCount: listings.length,
      messageId: info.messageId 
    });

    return info;
  } catch (error) {
    logger.error('Error sending alert email', { 
      error: error.message, 
      userEmail, 
      alertName 
    });
    throw error;
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(userEmail, userName = null) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue sur Carindex</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background: #f9fafb; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: white; font-size: 32px; font-weight: bold;">C</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #111827;">Bienvenue sur Carindex !</h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              ${userName ? `Bonjour ${userName},` : 'Bonjour,'}
            </p>
            
            <p style="color: #6b7280; margin-bottom: 24px;">
              Merci de nous avoir rejoint ! Carindex vous donne accès à des millions d'annonces de véhicules d'occasion avec des prix marché fiables et des alertes intelligentes.
            </p>
            
            <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 16px;">
                🚀 Pour commencer :
              </h2>
              <ol style="color: #374151; padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 12px;">Recherchez des véhicules selon vos critères</li>
                <li style="margin-bottom: 12px;">Consultez les prix marché pour chaque annonce</li>
                <li style="margin-bottom: 12px;">Créez des alertes pour être notifié des nouvelles opportunités</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="${FRONTEND_URL}/#/search" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Commencer la recherche
              </a>
            </div>
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>Besoin d'aide ? <a href="mailto:support@carindex.com" style="color: #2563eb;">Contactez notre support</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Bienvenue sur Carindex !

Merci de nous avoir rejoint ! Carindex vous donne accès à des millions d'annonces de véhicules d'occasion avec des prix marché fiables et des alertes intelligentes.

Pour commencer :
1. Recherchez des véhicules selon vos critères
2. Consultez les prix marché pour chaque annonce
3. Créez des alertes pour être notifié des nouvelles opportunités

Commencer la recherche: ${FRONTEND_URL}/#/search

Besoin d'aide ? Contactez notre support: support@carindex.com
    `.trim();

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: 'Bienvenue sur Carindex ! 🚗',
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Welcome email sent successfully', { userEmail, messageId: info.messageId });

    return info;
  } catch (error) {
    logger.error('Error sending welcome email', { error: error.message, userEmail });
    throw error;
  }
}

/**
 * Test email configuration
 */
/**
 * Send a generic email (wrapper for sendAlertEmail or direct nodemailer)
 */
export async function sendEmail(to, subject, html, text = null) {
  try {
    if (!to || !subject || !html) {
      throw new Error('to, subject, and html are required');
    }

    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { 
      to, 
      subject,
      messageId: info.messageId 
    });

    return info;
  } catch (error) {
    logger.error('Error sending email', { 
      error: error.message, 
      to, 
      subject 
    });
    throw error;
  }
}

export async function testEmailConfig() {
  try {
    await transporter.verify();
    logger.info('Email configuration is valid');
    return true;
  } catch (error) {
    logger.error('Email configuration error', { error: error.message });
    return false;
  }
}







