// locale
window.__TAURI__.core.invoke('get_lang_json_string').then((jsonStr) => {
  window.LANG = JSON.parse(jsonStr);

  document.body.querySelectorAll('[data-lang]').forEach((e) => {
    e.textContent = window.LANG['SETTINGS'][e.getAttribute('data-lang')];
  })
})

// right click
document.body.addEventListener('contextmenu', e => e.preventDefault());

// btn
const appWindow = new window.__TAURI__.window.Window('settings');

document
  .getElementById('titlebar-minimize')
  ?.addEventListener('click', appWindow.minimize);
document
  .getElementById('titlebar-maximize')
  ?.addEventListener('click', appWindow.toggleMaximize);
document
  .getElementById('titlebar-close')
  ?.addEventListener('click', appWindow.close);

// #sidebar div
document.querySelectorAll('#sidebar div').forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault();

    document.querySelectorAll('.content-section').forEach(section => {
      section.style.display = 'none';
    });
    document.getElementById(link.getAttribute('data-target')).style.display = 'block';

    document.querySelectorAll('#sidebar div').forEach(div => {
      div.classList.remove('on');
    });
    link.classList.add('on');
  });
});

// ripple
document.querySelectorAll('.ripple-button').forEach(button => {
  button.addEventListener('click', (e) => {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    button.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  });
});

// display-language-select
const settingStore = new window.__TAURI_PLUGIN_STORE__.Store('settings.bin'), lang_select = document.querySelector('#display-language-select');
settingStore.get('language_json_filename').then(languageJsonFilename => lang_select.value = languageJsonFilename);
lang_select.addEventListener('change', async () => {
  await settingStore.set('language_json_filename', lang_select.value);
  await settingStore.save();
})