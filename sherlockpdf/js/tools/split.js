/**
 * SherlockPDF Split Tool
 * Splits a PDF into individual pages with previews and download.
 */
var SplitTool = (function () {
  'use strict';

  var pdfLibDoc = null;
  var pdfJsDoc = null;
  var pdfBytes = null;
  var originalFilename = '';

  // --- DOM refs (set by init) ---
  var uploadZoneEl, browseBtn, fileInput, errorContainer, errorText,
    resultsContainer, appContainer, onToast, onUsageUpdate, onShowUpgradePrompt;

  function init(opts) {
    uploadZoneEl = opts.uploadZone;
    browseBtn = opts.browseBtn;
    fileInput = opts.fileInput;
    errorContainer = opts.errorContainer;
    errorText = opts.errorText;
    resultsContainer = opts.resultsContainer;
    appContainer = opts.appContainer;
    onToast = opts.onToast || function () {};
    onUsageUpdate = opts.onUsageUpdate || function () {};
    onShowUpgradePrompt = opts.onShowUpgradePrompt || function () {};

    bindEvents();
  }

  function bindEvents() {
    uploadZoneEl.addEventListener('click', function (e) {
      if (e.target === browseBtn || browseBtn.contains(e.target)) return;
      fileInput.click();
    });
    uploadZoneEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    browseBtn.addEventListener('click', function (e) { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) { handleFile(fileInput.files[0]); }
    });

    // Drag and drop
    uploadZoneEl.addEventListener('dragenter', function (e) { e.preventDefault(); uploadZoneEl.classList.add('upload-zone--dragover'); });
    uploadZoneEl.addEventListener('dragover', function (e) { e.preventDefault(); uploadZoneEl.classList.add('upload-zone--dragover'); });
    uploadZoneEl.addEventListener('dragleave', function (e) { e.preventDefault(); uploadZoneEl.classList.remove('upload-zone--dragover'); });
    uploadZoneEl.addEventListener('drop', function (e) {
      e.preventDefault(); uploadZoneEl.classList.remove('upload-zone--dragover');
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
  }

  function handleFile(file) {
    hideError();

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError("That doesn't look like a PDF. Please upload a .pdf file.");
      return;
    }

    // Paywall: check daily limit
    var check = SherlockPaywall.canProcessFiles(1);
    if (!check.allowed) {
      onShowUpgradePrompt();
      return;
    }

    // Paywall: check file size
    var sizeCheck = SherlockPaywall.checkFileSize(file.size);
    if (!sizeCheck.allowed) {
      onToast('File is ' + sizeCheck.sizeMB + ' MB \u2014 limit is ' + sizeCheck.limitMB + ' MB.', 'error');
      return;
    }

    originalFilename = file.name;
    var fileSizeStr = formatFileSize(file.size);

    showProcessing();

    var reader = new FileReader();
    reader.onload = function () {
      pdfBytes = new Uint8Array(reader.result);
      loadPdf(pdfBytes, fileSizeStr);
    };
    reader.onerror = function () {
      showUploadZone();
      showError("This PDF couldn't be read. The file may be corrupted.");
    };
    reader.readAsArrayBuffer(file);
  }

  async function loadPdf(bytes, fileSizeStr) {
    try {
      pdfLibDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch (err) {
      showUploadZone();
      if (err.message && err.message.toLowerCase().includes('encrypt')) {
        showError('Password-protected PDFs are not supported.');
      } else {
        showError("This PDF couldn't be read. The file may be corrupted.");
      }
      return;
    }

    var pageCount = pdfLibDoc.getPageCount();
    if (pageCount === 0) {
      showUploadZone();
      showError('This PDF has no pages.');
      return;
    }

    // Increment usage for all pages
    SherlockPaywall.incrementUsage(pageCount);
    onUsageUpdate();

    try {
      pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    } catch (err) {
      pdfJsDoc = null;
    }

    showResults(pageCount, fileSizeStr);
  }

  // --- UI States ---
  function showProcessing() {
    uploadZoneEl.hidden = true;
    resultsContainer.hidden = true;
    hideError();
    var proc = document.createElement('div');
    proc.className = 'processing';
    proc.id = 'split-processing';
    proc.innerHTML = '<div class="processing-spinner"></div><p class="processing-text">Processing PDF\u2026</p>';
    appContainer.insertBefore(proc, errorContainer);
  }

  function removeProcessing() {
    var proc = document.getElementById('split-processing');
    if (proc) proc.remove();
  }

  function showUploadZone() {
    removeProcessing();
    uploadZoneEl.hidden = false;
    resultsContainer.hidden = true;
    fileInput.value = '';
  }

  function showResults(pageCount, fileSizeStr) {
    removeProcessing();
    uploadZoneEl.hidden = true;
    resultsContainer.hidden = false;

    var baseName = stripPdfExtension(originalFilename);

    resultsContainer.innerHTML =
      '<div class="pdf-info">' +
        '<span class="pdf-info__name" title="' + escapeAttr(originalFilename) + '">' + escapeHTML(originalFilename) + '</span>' +
        '<span class="pdf-info__meta">' + pageCount + (pageCount === 1 ? ' page' : ' pages') + ' \u00B7 ' + fileSizeStr + '</span>' +
      '</div>' +
      '<div class="actions-bar">' +
        '<button class="actions-bar__download-all" id="split-download-all-btn" type="button">Download All as ZIP</button>' +
        '<button class="actions-bar__reset" id="split-reset-btn" type="button">Upload Another</button>' +
      '</div>' +
      '<ol class="page-grid" id="split-page-grid" role="list"></ol>';

    var pageGrid = document.getElementById('split-page-grid');
    renderPageGrid(pageGrid, pageCount, baseName);

    document.getElementById('split-download-all-btn').addEventListener('click', function () { handleDownloadAll(baseName); });
    document.getElementById('split-reset-btn').addEventListener('click', handleReset);

    pageGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.page-card__download');
      if (!btn) return;
      var pageIndex = parseInt(btn.getAttribute('data-page'), 10);
      downloadSinglePage(pageIndex, baseName);
    });
  }

  function renderPageGrid(grid, pageCount, baseName) {
    for (var i = 0; i < pageCount; i++) {
      var pageNum = i + 1;
      var li = document.createElement('li');
      li.className = 'page-card';
      li.innerHTML =
        '<div class="page-card__preview" id="split-preview-' + i + '">' +
          '<span class="page-card__preview-placeholder">\u2026</span>' +
        '</div>' +
        '<span class="page-card__label">Page ' + pageNum + '</span>' +
        '<button class="page-card__download" type="button" data-page="' + i + '" aria-label="Download page ' + pageNum + ' as PDF">Download</button>';
      grid.appendChild(li);
      renderPreview(i);
    }
  }

  async function renderPreview(pageIndex) {
    if (!pdfJsDoc) return;
    try {
      var page = await pdfJsDoc.getPage(pageIndex + 1);
      var viewport = page.getViewport({ scale: 1 });
      var previewWidth = 200;
      var scale = previewWidth / viewport.width;
      var scaledViewport = page.getViewport({ scale: scale });
      var canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;
      var container = document.getElementById('split-preview-' + pageIndex);
      if (container) { container.innerHTML = ''; container.appendChild(canvas); }
    } catch (err) { /* preview is optional */ }
  }

  // --- Downloads ---
  async function downloadSinglePage(pageIndex, baseName) {
    var filename = baseName + '-page-' + (pageIndex + 1) + '.pdf';
    var pageBytes = await extractPage(pageIndex);
    triggerDownload(pageBytes, filename, 'application/pdf');
  }

  async function handleDownloadAll(baseName) {
    if (!pdfLibDoc) return;
    var btn = document.getElementById('split-download-all-btn');
    btn.textContent = 'Preparing ZIP\u2026';
    btn.disabled = true;

    try {
      var zip = new JSZip();
      var pageCount = pdfLibDoc.getPageCount();
      for (var i = 0; i < pageCount; i++) {
        var pageBytes = await extractPage(i);
        zip.file(baseName + '-page-' + (i + 1) + '.pdf', pageBytes);
      }
      var zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(zipBlob, baseName + '-pages.zip', 'application/zip');
    } catch (err) {
      onToast('Something went wrong creating the ZIP. Please try again.', 'error');
    }

    btn.textContent = 'Download All as ZIP';
    btn.disabled = false;
  }

  function handleReset() {
    pdfLibDoc = null;
    pdfJsDoc = null;
    pdfBytes = null;
    originalFilename = '';
    hideError();
    showUploadZone();
  }

  // --- Helpers ---
  async function extractPage(pageIndex) {
    var newDoc = await PDFLib.PDFDocument.create();
    var copiedPages = await newDoc.copyPages(pdfLibDoc, [pageIndex]);
    newDoc.addPage(copiedPages[0]);

    // Add branding if free
    if (SherlockPaywall.shouldAddBranding()) {
      await SherlockPaywall.addBrandingToPage(newDoc, 0);
    }

    return await newDoc.save();
  }

  function triggerDownload(data, filename, mimeType) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function showError(message) {
    errorText.textContent = message;
    errorContainer.hidden = false;
  }

  function hideError() {
    errorContainer.hidden = true;
    errorText.textContent = '';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function stripPdfExtension(filename) {
    return filename.replace(/\.pdf$/i, '');
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Public ---
  function reset() {
    pdfLibDoc = null;
    pdfJsDoc = null;
    pdfBytes = null;
    originalFilename = '';
    if (resultsContainer) resultsContainer.hidden = true;
    if (uploadZoneEl) uploadZoneEl.hidden = false;
    if (errorContainer) errorContainer.hidden = true;
    removeProcessing();
    if (fileInput) fileInput.value = '';
  }

  return {
    init: init,
    reset: reset
  };
})();
