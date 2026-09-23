/**
 * Google Calendar REST API Service
 * Directly creates and manages events on the authenticated user's Google Calendar.
 */

import { getStoredAccessToken, signInWithGoogle } from './googleAuth';

export interface CalendarEventResult {
  success: boolean;
  message: string;
  eventLink?: string;
  eventId?: string;
}

/**
 * Creates an event directly in the user's primary Google Calendar via REST API.
 * Automatically prompts for Google Sign-In if not authenticated.
 */
export async function createDirectGoogleCalendarEvent(
  lead: {
    ownerName?: string;
    name?: string;
    projectName?: string;
    property?: string;
    contactNo?: string;
    mobile?: string;
    followUpDate?: string;
    followUpTime?: string;
    notes?: string;
    budgetAED?: number;
    budget?: number;
    community?: string;
    developer?: string;
    clientType?: string;
    expectationRequirements?: string;
  },
  type: 'project' | 'secondary' = 'project'
): Promise<CalendarEventResult> {
  if (!lead.followUpDate) {
    return {
      success: false,
      message: 'Please set a Follow-up Date first.',
    };
  }

  // 1. Get or prompt access token
  let token = getStoredAccessToken();
  if (!token) {
    try {
      const authRes = await signInWithGoogle();
      token = authRes.token;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Google sign-in was cancelled or failed.',
      };
    }
  }

  // 2. Prepare event metadata
  const client = (lead.ownerName || lead.name || 'Client').trim();
  const property = (lead.projectName || lead.property || 'Real Estate Lead').trim();
  const contact = lead.contactNo || lead.mobile || 'N/A';
  const role = lead.clientType ? `[${lead.clientType}] ` : '';
  const title = `📞 Follow-up: ${role}${client} - ${property}`;

  const descriptionParts = [
    `👤 Client: ${client}`,
    `📱 Contact: ${contact}`,
    `🏢 Property / Project: ${property}${lead.developer ? ` (${lead.developer})` : ''}`,
    lead.community ? `📍 Community: ${lead.community}` : '',
    lead.budgetAED || lead.budget ? `💰 Budget: AED ${(lead.budgetAED || lead.budget || 0).toLocaleString()}` : '',
    lead.expectationRequirements ? `🎯 Requirements: ${lead.expectationRequirements}` : '',
    lead.notes ? `\n📝 Follow-up Notes:\n${lead.notes}` : '',
    `\n---\nCreated from Xpotential Real Estate CRM`,
  ].filter(Boolean).join('\n');

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dubai';

  // Parse user selected time (e.g. "14:30") or default to 10:00 AM
  const time = (lead.followUpTime || '10:00').trim();
  const [hoursStr, minsStr] = time.split(':');
  const hours = parseInt(hoursStr, 10) || 10;
  const mins = parseInt(minsStr, 10) || 0;

  const [year, month, day] = lead.followUpDate.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, hours, mins, 0);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes duration

  const requestBody = {
    summary: title,
    description: descriptionParts,
    location: lead.community || lead.projectName || lead.property || 'Dubai, UAE',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: userTimeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: userTimeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 1440 }, // 1 day before
      ],
    },
  };

  try {
    let res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // If token expired (401) or missing scopes (403), clear cached token and prompt re-auth
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('xpotential_google_access_token');
      localStorage.removeItem('xpotential_google_token_expiry');

      const authRes = await signInWithGoogle();
      token = authRes.token;

      res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const rawMessage = errorJson.error?.message || `Google API error (${res.status})`;
      if (rawMessage.toLowerCase().includes('insufficient authentication scopes')) {
        throw new Error("Calendar permission was not granted. Please click 'Sign in with Google' and check the 'See, edit, share, and permanently delete all the calendars...' checkbox.");
      }
      throw new Error(rawMessage);
    }

    const createdEvent = await res.json();

    return {
      success: true,
      message: `✅ Saved directly to Google Calendar for ${client} on ${lead.followUpDate}!`,
      eventLink: createdEvent.htmlLink,
      eventId: createdEvent.id,
    };
  } catch (err: any) {
    console.error('Google Calendar API Error:', err);
    return {
      success: false,
      message: `Failed to save to Google Calendar: ${err.message || 'Unknown error'}`,
    };
  }
}
