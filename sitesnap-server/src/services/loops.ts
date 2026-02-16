/**
 * Loops transactional email service.
 *
 * Sends welcome emails on signup and subscription confirmation emails.
 * Loops REST API: https://loops.so/docs
 */

const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
const LOOPS_BASE_URL = "https://app.loops.so/api/v1";

interface LoopsContact {
  email: string;
  firstName?: string;
  userId: string;
  source?: string;
}

/**
 * Create or update a contact in Loops.
 * Called on Clerk user.created webhook.
 */
export async function createContact(contact: LoopsContact): Promise<void> {
  if (!LOOPS_API_KEY) {
    console.warn("LOOPS_API_KEY not set. Skipping contact creation.");
    return;
  }

  try {
    const response = await fetch(`${LOOPS_BASE_URL}/contacts/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: contact.email,
        firstName: contact.firstName,
        userId: contact.userId,
        source: contact.source || "sitesnap",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Loops createContact failed: ${response.status} ${body}`);
    }
  } catch (error) {
    console.error("Loops createContact error:", error);
  }
}

/**
 * Send a transactional email via Loops.
 */
export async function sendTransactionalEmail(
  email: string,
  transactionalId: string,
  dataVariables?: Record<string, string>
): Promise<void> {
  if (!LOOPS_API_KEY) {
    console.warn("LOOPS_API_KEY not set. Skipping transactional email.");
    return;
  }

  try {
    const response = await fetch(`${LOOPS_BASE_URL}/transactional`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        transactionalId,
        dataVariables: dataVariables || {},
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Loops transactional email failed: ${response.status} ${body}`);
    }
  } catch (error) {
    console.error("Loops transactional email error:", error);
  }
}

/**
 * Trigger an event for a contact (for event-based sequences).
 */
export async function sendEvent(
  email: string,
  eventName: string,
  eventProperties?: Record<string, string>
): Promise<void> {
  if (!LOOPS_API_KEY) {
    console.warn("LOOPS_API_KEY not set. Skipping event send.");
    return;
  }

  try {
    const response = await fetch(`${LOOPS_BASE_URL}/events/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        eventName,
        eventProperties: eventProperties || {},
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Loops sendEvent failed: ${response.status} ${body}`);
    }
  } catch (error) {
    console.error("Loops sendEvent error:", error);
  }
}
