/**
 * SherlockPDF Main Application
 * Manages view states, navigation, and orchestrates tool modules.
 */
(function () {
  'use strict';

  // Configure pdf.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // --- View State ---
  var ViewState = {
    LANDING: 'LANDING',
    TOOL_MERGE: 'TOOL_MERGE',
    TOOL_SPLIT: 'TOOL_SPLIT',
    VERIFY: 'VERIFY'
  };

  var currentView = ViewState.LANDING;
  var previousView = ViewState.LANDING;

  // --- DOM refs ---
  var heroSection = document.getElementById('hero-section');
  var mergePanel = document.getElementById('merge-panel');
  var splitPanel = document.getElementById('split-panel');
  var verifyScreen = document.getElementById('verify-screen');
  var proUnlockSection = document.getElementById('pro-unlock-section');

  // Nav
  var navRight = document.getElementById('nav-right');
  var navSignIn = document.getElementById('nav-sign-in');
  var navProBadge = document.getElementById('nav-pro-badge');
  var navManageLink = document.getElementById('nav-manage-link');

  // Tool selector cards
  var mergeCard = document.getElementById('merge-card');
  var splitCard = document.getElementById('split-card');

  // Back buttons
  var mergeBackBtn = document.getElementById('merge-back-btn');
  var splitBackBtn = document.getElementById('split-back-btn');

  // Usage counters
  var mergeUsageCounter = document.getElementById('merge-usage-counter');
  var splitUsageCounter = document.getElementById('split-usage-counter');

  // Pricing modal
  var pricingModal = document.getElementById('pricing-modal');
  var pricingBackdrop = document.getElementById('pricing-backdrop');
  var pricingCloseBtn = document.getElementById('pricing-close-btn');
  var monthlyCard = document.getElementById('pricing-monthly');
  var annualCard = document.getElementById('pricing-annual');
  var checkoutBtn = document.getElementById('pricing-checkout-btn');

  // Pro unlock
  var proUnlockForm = document.getElementById('pro-unlock-form');
  var proUnlockInput = document.getElementById('pro-unlock-input');
  var proUnlockSubmit = document.getElementById('pro-unlock-submit');
  var proUnlockError = document.getElementById('pro-unlock-error');

  // Toast
  var toastEl = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  var toastTimer = null;

  // Upgrade prompt containers (inline, inside tool panels)
  var mergeUpgradePrompt = document.getElementById('merge-upgrade-prompt');
  var splitUpgradePrompt = document.getElementById('split-upgrade-prompt');

  // Selected pricing plan
  var selectedPlan = 'monthly';

  // --- View Transitions ---
  function showView(view) {
    previousView = currentView;
    currentView = view;

    heroSection.hidden = view !== ViewState.LANDING;
    mergePanel.hidden = view !== ViewState.TOOL_MERGE;
    splitPanel.hidden = view !== ViewState.TOOL_SPLIT;
    verifyScreen.hidden = view !== ViewState.VERIFY;

    // Scroll to top on view change
    window.scrollTo(0, 0);
  }

  // --- Tool Selector ---
  mergeCard.addEventListener('click', function () {
    showView(ViewState.TOOL_MERGE);
    updateUsageCounters();
  });
  mergeCard.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mergeCard.click(); }
  });

  splitCard.addEventListener('click', function () {
    showView(ViewState.TOOL_SPLIT);
    updateUsageCounters();
  });
  splitCard.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); splitCard.click(); }
  });

  // Back buttons
  mergeBackBtn.addEventListener('click', function () {
    MergeTool.reset();
    hideUpgradePrompt('merge');
    showView(ViewState.LANDING);
  });
  splitBackBtn.addEventListener('click', function () {
    SplitTool.reset();
    hideUpgradePrompt('split');
    showView(ViewState.LANDING);
  });

  // --- Usage Counter Updates ---
  function updateUsageCounters() {
    var display = SherlockPaywall.getUsageDisplay();
    [mergeUsageCounter, splitUsageCounter].forEach(function (el) {
      if (!el) return;
      if (!display) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      var textEl = el.querySelector('.usage-counter__text');
      var fillEl = el.querySelector('.usage-counter__fill');
      if (textEl) textEl.textContent = display.text;
      if (fillEl) {
        fillEl.style.width = display.percent + '%';
        fillEl.className = 'usage-counter__fill ' + display.colorClass;
      }
    });
  }

  // --- Upgrade Prompt (inline) ---
  function showUpgradePrompt(tool) {
    var promptEl = tool === 'merge' ? mergeUpgradePrompt : splitUpgradePrompt;
    var uploadZone = tool === 'merge' ? document.getElementById('merge-upload-zone') : document.getElementById('split-upload-zone');
    var loadedState = tool === 'merge' ? document.getElementById('merge-loaded-state') : null;
    if (uploadZone) uploadZone.hidden = true;
    if (loadedState) loadedState.hidden = true;
    if (promptEl) promptEl.hidden = false;
  }

  function hideUpgradePrompt(tool) {
    var promptEl = tool === 'merge' ? mergeUpgradePrompt : splitUpgradePrompt;
    if (promptEl) promptEl.hidden = true;
  }

  // Bind upgrade prompt CTA buttons
  document.querySelectorAll('.upgrade-prompt__cta').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openPricingModal();
    });
  });

  // --- Pricing Modal ---
  function openPricingModal() {
    pricingModal.hidden = false;
    selectedPlan = 'monthly';
    updatePricingSelection();
    // Focus trap: focus the close button
    pricingCloseBtn.focus();
  }

  function closePricingModal() {
    pricingModal.hidden = true;
  }

  pricingCloseBtn.addEventListener('click', closePricingModal);
  pricingBackdrop.addEventListener('click', closePricingModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pricingModal.hidden) {
      closePricingModal();
    }
  });

  monthlyCard.addEventListener('click', function () {
    selectedPlan = 'monthly';
    updatePricingSelection();
  });
  annualCard.addEventListener('click', function () {
    selectedPlan = 'annual';
    updatePricingSelection();
  });

  function updatePricingSelection() {
    monthlyCard.classList.toggle('pricing-card--selected', selectedPlan === 'monthly');
    annualCard.classList.toggle('pricing-card--selected', selectedPlan === 'annual');
  }

  checkoutBtn.addEventListener('click', async function () {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Redirecting\u2026';
    try {
      var email = SherlockPaywall.getProEmail() || undefined;
      var result = await SherlockAuth.createCheckoutSession(selectedPlan, email);
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      showToast('Could not start checkout. Please try again.', 'error');
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Continue to checkout';
    }
  });

  // --- Pro Unlock (email input) ---
  if (navSignIn) {
    navSignIn.addEventListener('click', function (e) {
      e.preventDefault();
      proUnlockSection.hidden = !proUnlockSection.hidden;
      if (!proUnlockSection.hidden) proUnlockInput.focus();
    });
  }

  // Pro unlock upgrade link
  var proUnlockUpgradeLink = document.getElementById('pro-unlock-upgrade-link');
  if (proUnlockUpgradeLink) {
    proUnlockUpgradeLink.addEventListener('click', function (e) {
      e.preventDefault();
      proUnlockSection.hidden = true;
      openPricingModal();
    });
  }

  proUnlockForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = proUnlockInput.value.trim();
    if (!email) return;

    proUnlockSubmit.textContent = 'Checking\u2026';
    proUnlockSubmit.disabled = true;
    proUnlockError.hidden = true;
    proUnlockInput.classList.remove('pro-unlock__input--error', 'pro-unlock__input--success');

    try {
      var status = await SherlockAuth.checkSubscriptionStatus(email);
      if (status.active) {
        SherlockPaywall.setProStatus(email);
        proUnlockInput.classList.add('pro-unlock__input--success');
        showToast('Welcome back! Pro features unlocked.', 'success');
        setTimeout(function () {
          proUnlockSection.hidden = true;
          updateProUI();
          updateUsageCounters();
        }, 800);
      } else {
        proUnlockInput.classList.add('pro-unlock__input--error');
        proUnlockForm.classList.add('pro-unlock__form--shake');
        proUnlockError.textContent = 'No active subscription found for this email.';
        proUnlockError.hidden = false;
        setTimeout(function () {
          proUnlockForm.classList.remove('pro-unlock__form--shake');
        }, 300);
      }
    } catch (err) {
      proUnlockInput.classList.add('pro-unlock__input--error');
      proUnlockError.textContent = 'Could not check subscription. Please try again.';
      proUnlockError.hidden = false;
    }

    proUnlockSubmit.textContent = 'Unlock';
    proUnlockSubmit.disabled = false;
  });

  // --- Manage Subscription ---
  if (navManageLink) {
    navManageLink.addEventListener('click', async function (e) {
      e.preventDefault();
      var email = SherlockPaywall.getProEmail();
      if (!email) return;

      navManageLink.textContent = 'Opening\u2026';
      try {
        var result = await SherlockAuth.createPortalSession(email);
        if (result.url) {
          window.location.href = result.url;
        }
      } catch (err) {
        showToast('Could not open subscription management. Please try again.', 'error');
      }
      navManageLink.textContent = 'Manage';
    });
  }

  // --- Toast ---
  function showToast(message, type) {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastText.textContent = message;
    toastEl.className = 'toast toast--visible' + (type ? ' toast--' + type : '');
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('toast--visible');
      toastTimer = null;
    }, 4000);
  }

  // --- Pro UI State ---
  function updateProUI() {
    var isPro = SherlockPaywall.isPro();
    if (navSignIn) navSignIn.hidden = isPro;
    if (navProBadge) navProBadge.hidden = !isPro;
    if (navManageLink) navManageLink.hidden = !isPro;

    // Update upload hints for Pro
    var hints = document.querySelectorAll('.upload-zone__hint');
    hints.forEach(function (hint) {
      if (isPro && hint.dataset.proHint) {
        hint.textContent = hint.dataset.proHint;
      }
    });

    // Toggle Pro visual on tool panels
    mergePanel.classList.toggle('tool-panel--pro', isPro);
    splitPanel.classList.toggle('tool-panel--pro', isPro);

    updateUsageCounters();
  }

  // --- Stripe Redirect Return ---
  async function handleStripeReturn() {
    var sessionId = SherlockAuth.getSessionIdFromUrl();
    if (!sessionId) return false;

    showView(ViewState.VERIFY);

    try {
      var status = await SherlockAuth.checkSubscriptionStatus(sessionId);
      if (status.active && status.email) {
        SherlockPaywall.setProStatus(status.email);
        SherlockAuth.clearSessionIdFromUrl();
        showToast('Welcome to Pro! Your subscription is active.', 'success');
        updateProUI();
        showView(ViewState.LANDING);
        return true;
      } else {
        SherlockAuth.clearSessionIdFromUrl();
        showToast("We couldn't confirm your subscription. Try signing in with your email.", 'error');
        showView(ViewState.LANDING);
        proUnlockSection.hidden = false;
        proUnlockInput.focus();
        return true;
      }
    } catch (err) {
      SherlockAuth.clearSessionIdFromUrl();
      showToast("We couldn't confirm your subscription. Try signing in with your email.", 'error');
      showView(ViewState.LANDING);
      proUnlockSection.hidden = false;
      proUnlockInput.focus();
      return true;
    }
  }

  // --- Auto Re-verify Pro ---
  async function autoReverifyPro() {
    if (!SherlockPaywall.isPro()) return;
    if (!SherlockPaywall.needsReverify()) return;

    var email = SherlockPaywall.getProEmail();
    try {
      var status = await SherlockAuth.checkSubscriptionStatus(email);
      if (status.active) {
        SherlockPaywall.setProStatus(email);
      } else {
        SherlockPaywall.clearProStatus();
        showToast('Your Pro subscription has expired. Sign in again or upgrade.', 'error');
        updateProUI();
      }
    } catch (err) {
      // Silently fail; keep existing Pro status until next check
    }
  }

  // --- Initialize Tools ---
  MergeTool.init({
    uploadZone: document.getElementById('merge-upload-zone'),
    browseBtn: document.getElementById('merge-browse-btn'),
    fileInput: document.getElementById('merge-file-input'),
    loadedState: document.getElementById('merge-loaded-state'),
    toolbar: document.getElementById('merge-toolbar'),
    addMoreBtn: document.getElementById('merge-add-more-btn'),
    addFileInput: document.getElementById('merge-add-file-input'),
    clearAllBtn: document.getElementById('merge-clear-all-btn'),
    pageSummary: document.getElementById('merge-page-summary'),
    fileList: document.getElementById('merge-file-list'),
    combineBtn: document.getElementById('merge-combine-btn'),
    onToast: showToast,
    onUsageUpdate: updateUsageCounters,
    onShowUpgradePrompt: function () { showUpgradePrompt('merge'); }
  });

  SplitTool.init({
    uploadZone: document.getElementById('split-upload-zone'),
    browseBtn: document.getElementById('split-browse-btn'),
    fileInput: document.getElementById('split-file-input'),
    errorContainer: document.getElementById('split-error'),
    errorText: document.getElementById('split-error-text'),
    resultsContainer: document.getElementById('split-results'),
    appContainer: document.getElementById('split-app'),
    onToast: showToast,
    onUsageUpdate: updateUsageCounters,
    onShowUpgradePrompt: function () { showUpgradePrompt('split'); }
  });

  // --- Boot ---
  async function boot() {
    updateProUI();

    // Handle Stripe return
    var handled = await handleStripeReturn();
    if (handled) return;

    // Auto re-verify Pro
    autoReverifyPro();

    showView(ViewState.LANDING);
  }

  boot();
})();
