/**
 * SherlockPDF Auth Module
 * Email-based Stripe status check, checkout, and portal management.
 */
var SherlockAuth = (function () {
  'use strict';

  // --- API Calls ---
  async function createCheckoutSession(priceId, email) {
    var body = { priceId: priceId };
    if (email) body.email = email;
    var res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Checkout request failed');
    return await res.json();
  }

  async function checkSubscriptionStatus(emailOrSessionId) {
    var param = '';
    if (emailOrSessionId.startsWith('cs_')) {
      param = '?session_id=' + encodeURIComponent(emailOrSessionId);
    } else {
      param = '?email=' + encodeURIComponent(emailOrSessionId);
    }
    var res = await fetch('/api/status' + param);
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  }

  async function createPortalSession(email) {
    var res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    if (!res.ok) throw new Error('Portal request failed');
    return await res.json();
  }

  // --- Stripe Redirect Return ---
  function getSessionIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('session_id') || null;
  }

  function clearSessionIdFromUrl() {
    var url = new URL(window.location);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  return {
    createCheckoutSession: createCheckoutSession,
    checkSubscriptionStatus: checkSubscriptionStatus,
    createPortalSession: createPortalSession,
    getSessionIdFromUrl: getSessionIdFromUrl,
    clearSessionIdFromUrl: clearSessionIdFromUrl
  };
})();
