const aboveLayer = document.getElementById('above_layer'), blurLayer = document.getElementById('blur_layer'), menu = document.getElementById('menu'), widgetLayer = document.getElementById('widget_layer');

let close_menu_set_time_out, menu_after_close_fn;

export function showMenu(title, itemArr, rect, afterShowFn, afterCloseFn) {
    if (itemArr?.length > 0) {
        menu.innerHTML = '';

        const menuTitle = document.createElement('p');
        menuTitle.classList.add('menu-title');
        menuTitle.textContent = title;
        menu.appendChild(menuTitle);
        itemArr.forEach(e => menu.appendChild(e));
    }

    clearTimeout(close_menu_set_time_out);
    const { left, right, bottom } = rect;
    // menu.style.left = (left + right) / 2 > (document.body.offsetWidth - 124) ?
    //     (`${document.body.offsetWidth - 124}px`) : (`${(left + right) / 2}px`);
    menu.style.left = '';
    menu.style.right = '';
    if (left + right > document.body.offsetWidth) {
        menu.style.right = (`${document.body.offsetWidth - right}px`);
    } else {
        menu.style.left = (`${left}px`);
    }

    menu.style.top = `${bottom + 6}px`;

    menu_after_close_fn = afterCloseFn;
    popLayer(true);
    aboveLayer.addEventListener('click', closeMenu);
    menu.removeAttribute('hidden');
    // afterShowFn()
    if (afterShowFn) afterShowFn();
    window.is_menu_open = true;
}

export function closeMenu() {
    popLayer(false);
    aboveLayer.removeEventListener('click', closeMenu);
    menu.setAttribute('hidden', 'hidden');
    // afterCloseFn()
    if (menu_after_close_fn) menu_after_close_fn();
    menu_after_close_fn = null;
    window.is_menu_open = false;
}

export function clipMenuItemStr(str, length) {
    return str.length > length ? str.slice(0, length - 1) + '…' : str;
}

export function popLayer(bool) {
    if (bool) {
        aboveLayer.style.pointerEvents = 'auto';
        widgetLayer.style.transform = 'scale(0.986)';
        blurLayer.style.backdropFilter = 'blur(3px)';
    } else {
        blurLayer.style.backdropFilter = '';
        widgetLayer.style.transform = 'scale(1)';
        aboveLayer.style.pointerEvents = '';
    }
}