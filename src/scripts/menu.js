const aboveLayer = document.getElementById('above_layer'), blurLayer = document.getElementById('blur_layer'), menu = document.getElementById('menu');

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
    const { left, right, top, bottom } = rect;
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
    aboveLayer.style.pointerEvents = 'auto';
    blurLayer.style.backdropFilter = 'blur(5px)';
    aboveLayer.addEventListener('click', closeMenu);
    menu.style.display = 'block';
    // afterShowFn()
    if (afterShowFn) afterShowFn();
    setTimeout(() => {
        menu.classList.add('show');
    });
}

export function closeMenu() {
    blurLayer.style.backdropFilter = '';
    aboveLayer.style.pointerEvents = '';
    menu.classList.remove('show');
    // afterCloseFn()
    if (menu_after_close_fn) menu_after_close_fn();
    menu_after_close_fn = null;
    close_menu_set_time_out = setTimeout(() => {
        menu.style.display = '';
    }, 300);
}

export function clipMenuItemStr(str, length) {
    return str.length > length ? str.slice(0, length - 1) + '…' : str;
}