// Small progressive enhancements. Every page still works with JavaScript turned off.
(function () {
  'use strict';
  var root = document.documentElement;

  // ---------- Theme toggle ----------
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked: theme still switches for this page */ }
    });
  });

  // ---------- Dropdown and mobile menus (<details data-menu>) ----------
  var menus = Array.prototype.slice.call(document.querySelectorAll('[data-menu]'));
  menus.forEach(function (menu) {
    menu.addEventListener('toggle', function () {
      if (menu.open) menus.forEach(function (m) { if (m !== menu) m.open = false; });
    });
  });
  document.addEventListener('click', function (e) {
    menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    menus.forEach(function (m) {
      if (m.open) { m.open = false; m.querySelector('summary').focus(); }
    });
  });

  // ---------- Toasts ----------
  function dismiss(toast) {
    if (!toast || toast.classList.contains('is-leaving')) return;
    toast.classList.add('is-leaving');
    setTimeout(function () { toast.remove(); }, 200);
  }
  document.querySelectorAll('[data-toast]').forEach(function (toast) {
    var timer = setTimeout(function () { dismiss(toast); }, 5000);
    toast.addEventListener('mouseenter', function () { clearTimeout(timer); });
    toast.addEventListener('mouseleave', function () { timer = setTimeout(function () { dismiss(toast); }, 2500); });
    var close = toast.querySelector('[data-toast-close]');
    if (close) close.addEventListener('click', function () { dismiss(toast); });
  });

  // ---------- Confirm dialog for destructive forms (<form data-confirm="...">) ----------
  var dialog = document.getElementById('confirm-dialog');
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('form[data-confirm]') || form.dataset.confirmed === '1') return;
    e.preventDefault();
    var text = form.dataset.confirm;
    if (!dialog || typeof dialog.showModal !== 'function') {
      if (window.confirm(text)) { form.dataset.confirmed = '1'; form.submit(); }
      return;
    }
    document.getElementById('confirm-title').textContent = form.dataset.confirmTitle || 'Are you sure?';
    document.getElementById('confirm-text').textContent = text;
    document.getElementById('confirm-ok').textContent = form.dataset.confirmLabel || 'Delete';
    dialog.returnValue = '';
    dialog.showModal();
    dialog.addEventListener('close', function onClose() {
      dialog.removeEventListener('close', onClose);
      if (dialog.returnValue === 'confirm') {
        form.dataset.confirmed = '1';
        if (form.requestSubmit) form.requestSubmit(); else form.submit();
      }
    });
  });

  // ---------- Loading spinner on submit buttons (<form data-loading>) ----------
  // Registered after the confirm handler, so it only runs for submissions that really go ahead.
  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    var form = e.target;
    if (!form.matches('form[data-loading]')) return;
    var btn = e.submitter || form.querySelector('[type="submit"]');
    if (btn) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); }
  });
  // Restore buttons if the page comes back from the back/forward cache.
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('.is-loading').forEach(function (b) { b.classList.remove('is-loading'); b.removeAttribute('aria-busy'); });
  });

  // ---------- Character counters (<textarea data-counter="id-of-output">) ----------
  document.querySelectorAll('[data-counter]').forEach(function (field) {
    var out = document.getElementById(field.dataset.counter);
    var max = Number(field.getAttribute('maxlength')) || 0;
    function update() {
      out.textContent = field.value.length + '/' + max;
      out.classList.toggle('near', max && field.value.length > max * 0.9);
    }
    field.addEventListener('input', update);
    update();
  });

  // ---------- Show / hide password ----------
  document.querySelectorAll('[data-password-toggle]').forEach(function (btn) {
    var input = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  // ---------- Image drop zone with client-side checks and preview ----------
  document.querySelectorAll('[data-dropzone]').forEach(function (input) {
    var zone = input.closest('.dropzone');
    var wrap = input.closest('[data-image-field]');
    var error = wrap.querySelector('[data-file-error]');
    var preview = wrap.querySelector('[data-preview]');
    var img = preview.querySelector('img');
    var name = preview.querySelector('[data-file-name]');
    var size = preview.querySelector('[data-file-size]');
    var MAX = 2 * 1024 * 1024;
    var TYPES = ['image/jpeg', 'image/png'];

    function clear() {
      input.value = '';
      preview.hidden = true;
      zone.hidden = false;
      if (img.src) URL.revokeObjectURL(img.src);
      img.removeAttribute('src');
    }
    input.addEventListener('change', function () {
      error.textContent = '';
      var file = input.files && input.files[0];
      if (!file) { clear(); return; }
      if (TYPES.indexOf(file.type) === -1) { error.textContent = 'Only JPEG or PNG images are allowed.'; clear(); return; }
      if (file.size > MAX) { error.textContent = 'Image must be 2 MB or smaller.'; clear(); return; }
      img.src = URL.createObjectURL(file);
      name.textContent = file.name;
      size.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      preview.hidden = false;
      zone.hidden = true;
      var remove = wrap.querySelector('input[name="remove_image"]');
      if (remove) remove.checked = false;
    });
    preview.querySelector('[data-file-remove]').addEventListener('click', function () { clear(); input.focus(); });
    ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function () { zone.classList.add('is-dragging'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function () { zone.classList.remove('is-dragging'); }); });
  });

  // ---------- Live filters on the board (<form data-autosubmit>) ----------
  var filters = document.querySelector('form[data-autosubmit]');
  if (filters) {
    var q = filters.querySelector('input[name="q"]');
    var timer;
    function go(fromSearch) {
      // Leave empty fields out of the URL. The page number is never part of this form,
      // so any filter change starts again at page 1.
      Array.prototype.forEach.call(filters.elements, function (el) {
        if (el.name && !el.value) el.disabled = true;
      });
      try { if (fromSearch) sessionStorage.setItem('refocus-search', String(q.selectionStart || q.value.length)); } catch (e) { /* ignore */ }
      filters.submit();
    }
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { go(true); }, 300); });
    filters.addEventListener('change', function (e) { if (e.target !== q) go(false); });
    try {
      var pos = sessionStorage.getItem('refocus-search');
      if (pos !== null) {
        sessionStorage.removeItem('refocus-search');
        q.focus();
        q.setSelectionRange(Number(pos), Number(pos));
      }
    } catch (e) { /* ignore */ }

    var toolbar = filters.closest('.toolbar');
    var stuck = function () { toolbar.classList.toggle('is-stuck', toolbar.getBoundingClientRect().top <= parseFloat(getComputedStyle(root).fontSize) * 3.5 + 1); };
    window.addEventListener('scroll', stuck, { passive: true });
    stuck();
  }
})();
