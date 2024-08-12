// locale
{
  const settingsStore = new window.__TAURI_PLUGIN_STORE__.Store('settings.bin');
  const dataObj = await settingsStore.get('data');
  window.__TAURI__.core.invoke('get_lang_json_string', { "languageJsonFilename": dataObj["language_json_filename"] })
    .then((jsonStr) => {
      window.LANG = JSON.parse(jsonStr);

      document.body.querySelectorAll('[data-lang]').forEach((e) => {
        e.textContent = window.LANG['SETTINGS'][e.getAttribute('data-lang')];
      })
    })
}

// right click
document.body.addEventListener('contextmenu', e => e.preventDefault());

{
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
}

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

// 
// SETTINGS
// 
{
  window.save_config_settimeout = {};
  const settingStore = new window.__TAURI_PLUGIN_STORE__.Store('settings.bin'), language_json_filename = document.getElementById('display-language-select'), set_wallpaper_for_windows = document.getElementById('set-wallpaper-for-system');

  // read
  const dataObj = await settingStore.get('data');
  set_wallpaper_for_windows.checked = dataObj["set_wallpaper_for_windows"];
  language_json_filename.value = dataObj["language_json_filename"];

  // save
  function saveConfig(key, value) {
    clearTimeout(window.save_config_settimeout[key]);
    window.save_config_settimeout[key] = setTimeout(async () => {
      const dataObj = await settingStore.get('data');
      dataObj[key] = value;
      await settingStore.set('data', dataObj);
      await settingStore.save();
    }, 500);
  }

  // set_wallpaper_for_windows
  set_wallpaper_for_windows.addEventListener('change', () => saveConfig('set_wallpaper_for_windows', set_wallpaper_for_windows.checked));

  // language_json_filename
  language_json_filename.addEventListener('change', () => saveConfig('language_json_filename', language_json_filename.value));
}