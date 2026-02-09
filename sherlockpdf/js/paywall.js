/**
 * SherlockPDF Paywall Module
 * Handles free/pro gating, usage tracking, and upgrade prompts.
 */
var SherlockPaywall = (function () {
  'use strict';

  var FREE_DAILY_LIMIT = 25;
  var FREE_FILE_SIZE_MB = 50;
  var PRO_FILE_SIZE_MB = 200;
  var BRANDING_TEXT = 'Powered by SherlockPDF';

  // --- LocalStorage Keys ---
  function usageKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return 'sherlockpdf_usage_' + y + '-' + m + '-' + day;
  }

  // --- Pro Status ---
  function isPro() {
    var email = localStorage.getItem('sherlockpdf_pro_email');
    var verified = localStorage.getItem('sherlockpdf_pro_verified');
    if (!email || !verified) return false;
    return true;
  }

  function getProEmail() {
    return localStorage.getItem('sherlockpdf_pro_email') || '';
  }

  function needsReverify() {
    var verified = localStorage.getItem('sherlockpdf_pro_verified');
    if (!verified) return true;
    var ts = parseInt(verified, 10);
    return Date.now() - ts > 86400000; // 24 hours
  }

  function setProStatus(email) {
    localStorage.setItem('sherlockpdf_pro_email', email);
    localStorage.setItem('sherlockpdf_pro_verified', String(Date.now()));
  }

  function clearProStatus() {
    localStorage.removeItem('sherlockpdf_pro_email');
    localStorage.removeItem('sherlockpdf_pro_verified');
  }

  // --- Usage Tracking ---
  function getUsageCount() {
    var count = localStorage.getItem(usageKey());
    return count ? parseInt(count, 10) : 0;
  }

  function incrementUsage(amount) {
    var count = getUsageCount() + (amount || 1);
    localStorage.setItem(usageKey(), String(count));
    return count;
  }

  function canProcessFiles(fileCount) {
    if (isPro()) return { allowed: true, remaining: Infinity };
    var used = getUsageCount();
    var remaining = FREE_DAILY_LIMIT - used;
    if (remaining <= 0) return { allowed: false, remaining: 0 };
    if (fileCount > remaining) return { allowed: false, remaining: remaining };
    return { allowed: true, remaining: remaining };
  }

  // --- File Size Check ---
  function checkFileSize(fileSizeBytes) {
    var limitMB = isPro() ? PRO_FILE_SIZE_MB : FREE_FILE_SIZE_MB;
    var sizeMB = fileSizeBytes / (1024 * 1024);
    return {
      allowed: sizeMB <= limitMB,
      sizeMB: Math.round(sizeMB * 10) / 10,
      limitMB: limitMB
    };
  }

  // --- Branding ---
  function shouldAddBranding() {
    return !isPro();
  }

  async function addBrandingToPage(pdfDoc, pageIndex) {
    if (!shouldAddBranding()) return;
    var page = pdfDoc.getPage(pageIndex);
    var { width } = page.getSize();
    var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    var textWidth = font.widthOfTextAtSize(BRANDING_TEXT, 8);
    page.drawText(BRANDING_TEXT, {
      x: (width - textWidth) / 2,
      y: 10,
      size: 8,
      font: font,
      color: PDFLib.rgb(0.6, 0.6, 0.6)
    });
  }

  // --- Usage counter UI ---
  function getUsageDisplay() {
    if (isPro()) return null;
    var used = getUsageCount();
    var pct = Math.min(100, Math.round((used / FREE_DAILY_LIMIT) * 100));
    var colorClass = '';
    if (pct >= 100) colorClass = 'usage-counter__fill--limit';
    else if (pct >= 80) colorClass = 'usage-counter__fill--warning';
    return {
      text: used + ' of ' + FREE_DAILY_LIMIT + ' files used today',
      percent: pct,
      colorClass: colorClass
    };
  }

  return {
    isPro: isPro,
    getProEmail: getProEmail,
    needsReverify: needsReverify,
    setProStatus: setProStatus,
    clearProStatus: clearProStatus,
    getUsageCount: getUsageCount,
    incrementUsage: incrementUsage,
    canProcessFiles: canProcessFiles,
    checkFileSize: checkFileSize,
    shouldAddBranding: shouldAddBranding,
    addBrandingToPage: addBrandingToPage,
    getUsageDisplay: getUsageDisplay,
    FREE_DAILY_LIMIT: FREE_DAILY_LIMIT,
    FREE_FILE_SIZE_MB: FREE_FILE_SIZE_MB,
    PRO_FILE_SIZE_MB: PRO_FILE_SIZE_MB
  };
})();
