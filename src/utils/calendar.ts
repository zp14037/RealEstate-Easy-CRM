/**
 * Google Calendar Integration Utilities
 * Saves follow-up reminders directly to Google Calendar using Google OAuth 2.0 & Calendar API
 * without redirecting or opening any Google Calendar pages.
 */

import { createDirectGoogleCalendarEvent } from '../services/googleCalendarApi';
import { getStoredAccessToken, signInWithGoogle, getStoredGoogleUser } from '../services/googleAuth';

export { getStoredAccessToken, signInWithGoogle, getStoredGoogleUser };

export interface DirectCalendarResult {
  success: boolean;
  message: string;
  isBackground: boolean;
  eventLink?: string;
}

/**
 * Saves a follow-up directly into Google Calendar in the background via Google Calendar REST API.
 * Prompts Google Sign-In if not yet signed in.
 */
export async function saveDirectlyToGoogleCalendar(
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
): Promise<DirectCalendarResult> {
  if (!lead.followUpDate) {
    return {
      success: false,
      message: 'Please set a Follow-up Date first.',
      isBackground: true,
    };
  }

  const res = await createDirectGoogleCalendarEvent(lead, type);
  return {
    success: res.success,
    message: res.message,
    isBackground: true,
    eventLink: res.eventLink,
  };
}
