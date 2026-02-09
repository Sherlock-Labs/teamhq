/**
 * SherlockPDF Merge Tool
 * Combines multiple PDFs and images into a single PDF.
 */
var MergeTool = (function () {
  'use strict';

  // --- Supported types ---
  var SUPPORTED_TYPES = {
    'application/pdf': 'pdf',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
    'image/bmp': 'image',
    'image/tiff': 'image'
  };

  var EXTENSION_MAP = {
    'pdf': 'pdf', 'png': 'image', 'jpg': 'image', 'jpeg': 'image',
    'webp': 'image', 'gif': 'image', 'bmp': 'image', 'tiff': 'image', 'tif': 'image'
  };

  var files = [];
  var isCombining = false;
  var sortable = null;

  // --- DOM refs (set by init) ---
  var uploadZoneEl, browseBtn, fileInput, loadedState, toolbarEl,
    addMoreBtn, addFileInput, clearAllBtn, pageSummaryEl, fileListEl,
    combineBtn, onToast, onUsageUpdate, onShowUpgradePrompt;

  function init(opts) {
    uploadZoneEl = opts.uploadZone;
    browseBtn = opts.browseBtn;
    fileInput = opts.fileInput;
    loadedState = opts.loadedState;
    toolbarEl = opts.toolbar;
    addMoreBtn = opts.addMoreBtn;
    addFileInput = opts.addFileInput;
    clearAllBtn = opts.clearAllBtn;
    pageSummaryEl = opts.pageSummary;
    fileListEl = opts.fileList;
    combineBtn = opts.combineBtn;
    onToast = opts.onToast || function () {};
    onUsageUpdate = opts.onUsageUpdate || function () {};
    onShowUpgradePrompt = opts.onShowUpgradePrompt || function () {};

    bindEvents();
  }

  function bindEvents() {
    // Upload zone
    uploadZoneEl.addEventListener('click', function (e) {
      if (e.target === browseBtn || browseBtn.contains(e.target)) return;
      fileInput.click();
    });
    uploadZoneEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    browseBtn.addEventListener('click', function (e) { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) { handleFiles(fileInput.files); fileInput.value = ''; }
    });

    // Drag and drop on upload zone
    uploadZoneEl.addEventListener('dragenter', function (e) { e.preventDefault(); uploadZoneEl.classList.add('upload-zone--dragover'); });
    uploadZoneEl.addEventListener('dragover', function (e) { e.preventDefault(); uploadZoneEl.classList.add('upload-zone--dragover'); });
    uploadZoneEl.addEventListener('dragleave', function (e) { e.preventDefault(); uploadZoneEl.classList.remove('upload-zone--dragover'); });
    uploadZoneEl.addEventListener('drop', function (e) {
      e.preventDefault(); uploadZoneEl.classList.remove('upload-zone--dragover');
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    // Toolbar
    addMoreBtn.addEventListener('click', function () { addFileInput.click(); });
    addFileInput.addEventListener('change', function () {
      if (addFileInput.files.length > 0) { handleFiles(addFileInput.files); addFileInput.value = ''; }
    });
    clearAllBtn.addEventListener('click', handleClearAll);

    // Toolbar drag and drop
    toolbarEl.addEventListener('dragenter', function (e) { e.preventDefault(); toolbarEl.classList.add('toolbar--dragover'); });
    toolbarEl.addEventListener('dragover', function (e) { e.preventDefault(); toolbarEl.classList.add('toolbar--dragover'); });
    toolbarEl.addEventListener('dragleave', function (e) { e.preventDefault(); toolbarEl.classList.remove('toolbar--dragover'); });
    toolbarEl.addEventListener('drop', function (e) {
      e.preventDefault(); toolbarEl.classList.remove('toolbar--dragover');
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    // Combine button
    combineBtn.addEventListener('click', function () {
      if (isCombining || files.length === 0) return;
      combineAndDownload();
    });
  }

  // --- File type helpers ---
  function getFileTypeCategory(file) {
    if (SUPPORTED_TYPES[file.type]) return SUPPORTED_TYPES[file.type];
    var ext = file.name.split('.').pop().toLowerCase();
    return EXTENSION_MAP[ext] || null;
  }

  function getFileExtLabel(file) {
    var ext = file.name.split('.').pop().toUpperCase();
    if (ext === 'JPEG') ext = 'JPG';
    if (ext === 'TIF') ext = 'TIFF';
    return ext;
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try { return crypto.randomUUID(); } catch (e) { /* fall through */ }
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // --- File handling ---
  function handleFiles(fileList) {
    // Paywall: check daily limit
    var check = SherlockPaywall.canProcessFiles(fileList.length);
    if (!check.allowed) {
      if (check.remaining === 0) {
        onShowUpgradePrompt();
      } else {
        onToast('Daily limit: you can process ' + check.remaining + ' more file' + (check.remaining === 1 ? '' : 's') + ' today.', 'error');
      }
      return;
    }

    var unsupported = [];
    var toAdd = [];

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var category = getFileTypeCategory(file);
      if (!category) { unsupported.push(file.name); continue; }

      // Check file size
      var sizeCheck = SherlockPaywall.checkFileSize(file.size);
      if (!sizeCheck.allowed) {
        onToast('File "' + file.name + '" is ' + sizeCheck.sizeMB + ' MB \u2014 limit is ' + sizeCheck.limitMB + ' MB.', 'error');
        continue;
      }

      toAdd.push({
        id: generateId(),
        file: file,
        type: category,
        name: file.name,
        size: file.size,
        pageCount: category === 'image' ? 1 : 0,
        thumbnailCanvas: null,
        pdfLibDoc: null,
        error: null
      });
    }

    if (unsupported.length > 0) {
      if (unsupported.length === 1) onToast(unsupported[0] + ' is not a supported format', 'error');
      else onToast(unsupported.length + ' files were not a supported format', 'error');
    }

    if (toAdd.length === 0) return;

    files = files.concat(toAdd);
    renderAll();
    toAdd.forEach(function (entry) { processFile(entry); });
  }

  async function processFile(entry) {
    try {
      var arrayBuffer = await readFileAsArrayBuffer(entry.file);
      var bytes = new Uint8Array(arrayBuffer);
      if (entry.type === 'pdf') await processPdf(entry, bytes);
      else await processImage(entry);
    } catch (err) {
      entry.error = 'Could not read this file';
      entry.pageCount = 0;
    }
    updateFileItem(entry);
    updatePageCount();
  }

  async function processPdf(entry, bytes) {
    try {
      entry.pdfLibDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      entry.pageCount = entry.pdfLibDoc.getPageCount();
      if (entry.pageCount === 0) { entry.error = 'This PDF has no pages'; return; }
    } catch (err) {
      entry.error = 'Could not read this file';
      entry.pageCount = 0;
      return;
    }
    // Generate thumbnail
    try {
      var pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      var page = await pdfJsDoc.getPage(1);
      var viewport = page.getViewport({ scale: 1 });
      var thumbSize = 96;
      var coverScale = Math.max(thumbSize / viewport.width, thumbSize / viewport.height);
      var scaledViewport = page.getViewport({ scale: coverScale });
      var tempCanvas = document.createElement('canvas');
      tempCanvas.width = scaledViewport.width;
      tempCanvas.height = scaledViewport.height;
      await page.render({ canvasContext: tempCanvas.getContext('2d'), viewport: scaledViewport }).promise;
      var canvas = document.createElement('canvas');
      canvas.width = thumbSize;
      canvas.height = thumbSize;
      var cropX = Math.round((scaledViewport.width - thumbSize) / 2);
      var cropY = Math.round((scaledViewport.height - thumbSize) / 2);
      canvas.getContext('2d').drawImage(tempCanvas, cropX, cropY, thumbSize, thumbSize, 0, 0, thumbSize, thumbSize);
      entry.thumbnailCanvas = canvas;
      pdfJsDoc.destroy();
    } catch (err) { /* thumbnail is optional */ }
  }

  async function processImage(entry) {
    try {
      var img = await loadImage(entry.file);
      var thumbSize = 96;
      var canvas = document.createElement('canvas');
      canvas.width = thumbSize;
      canvas.height = thumbSize;
      var ctx = canvas.getContext('2d');
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var scale = Math.max(thumbSize / iw, thumbSize / ih);
      var sw = Math.round(iw * scale), sh = Math.round(ih * scale);
      ctx.drawImage(img, Math.round((thumbSize - sw) / 2), Math.round((thumbSize - sh) / 2), sw, sh);
      entry.thumbnailCanvas = canvas;
      entry.pageCount = 1;
    } catch (err) {
      entry.error = 'Could not read this file';
      entry.pageCount = 0;
    }
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Read failed')); };
      reader.readAsArrayBuffer(file);
    });
  }

  // --- Rendering ---
  function renderAll() {
    if (files.length === 0) {
      uploadZoneEl.hidden = false;
      loadedState.hidden = true;
      destroySortable();
      return;
    }
    uploadZoneEl.hidden = true;
    loadedState.hidden = false;
    fileListEl.innerHTML = '';
    files.forEach(function (entry) { fileListEl.appendChild(createFileItemEl(entry)); });
    updatePageCount();
    initSortable();
  }

  function createFileItemEl(entry) {
    var li = document.createElement('li');
    li.className = 'file-item' + (entry.error ? ' file-item--error' : '');
    li.setAttribute('role', 'listitem');
    li.setAttribute('data-id', entry.id);

    if (!entry.error) {
      var handle = document.createElement('div');
      handle.className = 'file-item__handle';
      handle.setAttribute('aria-label', 'Reorder ' + escapeAttr(entry.name));
      handle.innerHTML = '<svg viewBox="0 0 16 20" fill="currentColor"><circle cx="5" cy="4" r="2"/><circle cx="11" cy="4" r="2"/><circle cx="5" cy="10" r="2"/><circle cx="11" cy="10" r="2"/><circle cx="5" cy="16" r="2"/><circle cx="11" cy="16" r="2"/></svg>';
      li.appendChild(handle);
    } else {
      var spacer = document.createElement('div');
      spacer.style.width = '16px';
      spacer.style.flexShrink = '0';
      li.appendChild(spacer);
    }

    // Thumbnail
    var thumb = document.createElement('div');
    thumb.className = 'file-item__thumb';
    thumb.id = 'thumb-' + entry.id;
    if (entry.error) {
      thumb.innerHTML = '<span class="file-item__thumb-error" aria-hidden="true">!</span>';
    } else if (entry.thumbnailCanvas) {
      var c = document.createElement('canvas');
      c.width = entry.thumbnailCanvas.width;
      c.height = entry.thumbnailCanvas.height;
      c.getContext('2d').drawImage(entry.thumbnailCanvas, 0, 0);
      thumb.appendChild(c);
    } else {
      thumb.classList.add('file-item__thumb--loading');
    }
    li.appendChild(thumb);

    // Info
    var info = document.createElement('div');
    info.className = 'file-item__info';
    var nameRow = document.createElement('div');
    nameRow.className = 'file-item__name-row';
    var nameSpan = document.createElement('span');
    nameSpan.className = 'file-item__name';
    nameSpan.textContent = entry.name;
    nameSpan.title = entry.name;
    nameRow.appendChild(nameSpan);
    var badge = document.createElement('span');
    badge.className = 'file-item__badge ' + (entry.type === 'pdf' ? 'file-item__badge--pdf' : 'file-item__badge--image');
    badge.textContent = getFileExtLabel(entry);
    nameRow.appendChild(badge);
    info.appendChild(nameRow);

    if (entry.error) {
      var errMsg = document.createElement('span');
      errMsg.className = 'file-item__error-msg';
      errMsg.textContent = entry.error;
      info.appendChild(errMsg);
    } else {
      var meta = document.createElement('span');
      meta.className = 'file-item__meta';
      meta.id = 'meta-' + entry.id;
      if (entry.type === 'pdf' && entry.pageCount > 0) {
        meta.textContent = entry.pageCount + (entry.pageCount === 1 ? ' page' : ' pages') + ' \u2014 ' + formatFileSize(entry.size);
      } else {
        meta.textContent = formatFileSize(entry.size);
      }
      info.appendChild(meta);
    }
    li.appendChild(info);

    // Remove button
    var removeBtn = document.createElement('button');
    removeBtn.className = 'file-item__remove';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', 'Remove ' + escapeAttr(entry.name));
    removeBtn.innerHTML = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>';
    removeBtn.addEventListener('click', function () { removeFile(entry.id); });
    li.appendChild(removeBtn);

    return li;
  }

  function updateFileItem(entry) {
    var li = fileListEl.querySelector('[data-id="' + entry.id + '"]');
    if (!li) return;

    if (entry.error) li.classList.add('file-item--error');

    var thumb = li.querySelector('.file-item__thumb');
    if (thumb) {
      thumb.classList.remove('file-item__thumb--loading');
      if (entry.error) {
        thumb.innerHTML = '<span class="file-item__thumb-error" aria-hidden="true">!</span>';
      } else if (entry.thumbnailCanvas) {
        thumb.innerHTML = '';
        var canvas = document.createElement('canvas');
        canvas.width = entry.thumbnailCanvas.width;
        canvas.height = entry.thumbnailCanvas.height;
        canvas.getContext('2d').drawImage(entry.thumbnailCanvas, 0, 0);
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0.2s ease';
        thumb.appendChild(canvas);
        requestAnimationFrame(function () { canvas.style.opacity = '1'; });
      }
    }

    var meta = document.getElementById('meta-' + entry.id);
    if (meta && !entry.error && entry.type === 'pdf' && entry.pageCount > 0) {
      meta.textContent = entry.pageCount + (entry.pageCount === 1 ? ' page' : ' pages') + ' \u2014 ' + formatFileSize(entry.size);
    }

    if (entry.error) {
      var infoEl = li.querySelector('.file-item__info');
      var existingMeta = infoEl.querySelector('.file-item__meta');
      if (existingMeta) existingMeta.remove();
      if (!infoEl.querySelector('.file-item__error-msg')) {
        var errMsg = document.createElement('span');
        errMsg.className = 'file-item__error-msg';
        errMsg.textContent = entry.error;
        infoEl.appendChild(errMsg);
      }
    }
  }

  function updatePageCount() {
    var totalPages = 0, validFiles = 0;
    files.forEach(function (f) {
      if (!f.error) { totalPages += f.pageCount; validFiles++; }
    });
    pageSummaryEl.textContent = 'Total: ' + totalPages + (totalPages === 1 ? ' page' : ' pages') + ' from ' + validFiles + (validFiles === 1 ? ' file' : ' files');
    if (validFiles > 0 && !isCombining) {
      combineBtn.disabled = false;
      combineBtn.innerHTML = 'Merge &amp; Download (' + totalPages + (totalPages === 1 ? ' page' : ' pages') + ')';
    } else if (!isCombining) {
      combineBtn.disabled = true;
      combineBtn.innerHTML = 'Merge &amp; Download';
    }
    onUsageUpdate();
  }

  function removeFile(id) {
    var idx = files.findIndex(function (f) { return f.id === id; });
    if (idx === -1) return;
    files.splice(idx, 1);
    if (files.length === 0) { renderAll(); uploadZoneEl.focus(); return; }
    var li = fileListEl.querySelector('[data-id="' + id + '"]');
    var nextLi = li ? li.nextElementSibling : null;
    var prevLi = li ? li.previousElementSibling : null;
    if (li) li.remove();
    updatePageCount();
    var targetLi = nextLi || prevLi;
    if (targetLi) {
      var btn = targetLi.querySelector('.file-item__remove');
      if (btn) btn.focus(); else addMoreBtn.focus();
    } else { addMoreBtn.focus(); }
  }

  function handleClearAll() {
    files = [];
    renderAll();
  }

  // --- SortableJS ---
  function initSortable() {
    destroySortable();
    if (typeof Sortable === 'undefined') return;
    sortable = new Sortable(fileListEl, {
      animation: 150,
      ghostClass: 'file-item--ghost',
      chosenClass: 'file-item--chosen',
      handle: '.file-item__handle',
      onEnd: function (evt) {
        var movedItem = files.splice(evt.oldIndex, 1)[0];
        files.splice(evt.newIndex, 0, movedItem);
      }
    });
  }

  function destroySortable() {
    if (sortable) { sortable.destroy(); sortable = null; }
  }

  // --- Combine & Download ---
  async function combineAndDownload() {
    isCombining = true;
    var validFiles = files.filter(function (f) { return !f.error && f.pageCount > 0; });
    if (validFiles.length === 0) { isCombining = false; return; }

    // Increment usage counter
    SherlockPaywall.incrementUsage(validFiles.length);
    onUsageUpdate();

    combineBtn.disabled = true;
    combineBtn.innerHTML = '<span class="action-btn__spinner"></span> Merging ' + validFiles.length + (validFiles.length === 1 ? ' file' : ' files') + '\u2026';
    fileListEl.classList.add('file-list--combining');
    addMoreBtn.disabled = true;
    clearAllBtn.disabled = true;

    try {
      var pdfDoc = await PDFLib.PDFDocument.create();

      for (var i = 0; i < files.length; i++) {
        var entry = files[i];
        if (entry.error || entry.pageCount === 0) continue;
        if (entry.type === 'pdf') await addPdfPages(pdfDoc, entry);
        else await addImagePage(pdfDoc, entry);
        await new Promise(function (r) { setTimeout(r, 0); });
      }

      // Add branding to all pages if free
      if (SherlockPaywall.shouldAddBranding()) {
        var pageCount = pdfDoc.getPageCount();
        for (var p = 0; p < pageCount; p++) {
          await SherlockPaywall.addBrandingToPage(pdfDoc, p);
        }
      }

      var pdfBytes = await pdfDoc.save();
      triggerDownload(pdfBytes, 'merged-' + validFiles.length + '-files.pdf', 'application/pdf');

      combineBtn.classList.add('action-btn--success');
      combineBtn.innerHTML = '\u2713 Downloaded!';
      setTimeout(function () {
        combineBtn.classList.remove('action-btn--success');
        isCombining = false;
        updatePageCount();
        fileListEl.classList.remove('file-list--combining');
        addMoreBtn.disabled = false;
        clearAllBtn.disabled = false;
      }, 2000);

    } catch (err) {
      onToast('Something went wrong merging your files. Please try again.', 'error');
      isCombining = false;
      updatePageCount();
      fileListEl.classList.remove('file-list--combining');
      addMoreBtn.disabled = false;
      clearAllBtn.disabled = false;
    }
  }

  async function addPdfPages(outputDoc, entry) {
    if (!entry.pdfLibDoc) {
      var arrayBuffer = await readFileAsArrayBuffer(entry.file);
      entry.pdfLibDoc = await PDFLib.PDFDocument.load(new Uint8Array(arrayBuffer), { ignoreEncryption: true });
    }
    var pageIndices = [];
    for (var i = 0; i < entry.pdfLibDoc.getPageCount(); i++) pageIndices.push(i);
    var copiedPages = await outputDoc.copyPages(entry.pdfLibDoc, pageIndices);
    copiedPages.forEach(function (page) { outputDoc.addPage(page); });
  }

  async function addImagePage(outputDoc, entry) {
    var arrayBuffer = await readFileAsArrayBuffer(entry.file);
    var bytes = new Uint8Array(arrayBuffer);
    var embeddedImage;

    if (entry.file.type === 'image/png') {
      embeddedImage = await outputDoc.embedPng(bytes);
    } else if (entry.file.type === 'image/jpeg') {
      embeddedImage = await outputDoc.embedJpg(bytes);
    } else {
      var img = await loadImage(entry.file);
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      var dataUrl = canvas.toDataURL('image/png');
      var pngBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), function (c) { return c.charCodeAt(0); });
      embeddedImage = await outputDoc.embedPng(pngBytes);
    }

    var page = outputDoc.addPage([embeddedImage.width, embeddedImage.height]);
    page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
  }

  // --- Helpers ---
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

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Public ---
  function reset() {
    files = [];
    isCombining = false;
    destroySortable();
    if (fileListEl) fileListEl.innerHTML = '';
    if (loadedState) loadedState.hidden = true;
    if (uploadZoneEl) uploadZoneEl.hidden = false;
    if (combineBtn) {
      combineBtn.disabled = true;
      combineBtn.classList.remove('action-btn--success');
      combineBtn.innerHTML = 'Merge &amp; Download';
    }
    if (pageSummaryEl) pageSummaryEl.textContent = '';
  }

  return {
    init: init,
    reset: reset
  };
})();
