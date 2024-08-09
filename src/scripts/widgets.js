const invoke = window.__TAURI__.core.invoke;
const storedWidgets = new window.__TAURI_PLUGIN_STORE__.Store('widgets.bin');
const WIDGET_TYPE = {
    steamGames: "steamgames",
    note: "note"
};

const widgetLayer = document.querySelector('#widget_layer');

// 
// Rander Stored Widgets
// Bind event
// 
export async function initWidgets() {
    // widgets > data[] > {type, id, (a), (b)}
    const widgetsArr = await storedWidgets.get('data');

    if (widgetsArr) {
        // rander widgets
        for (const widget of widgetsArr) {
            let { type, id, a, b } = widget;
            await appendWidget(type, id, a, b);
        }
        bindEventListener();
    }

    setAddWidgetMenu();
}

async function appendWidget(type, id, a, b) {
    const widgetContainer = createElementWithAttributes('widget-container', { 'widget-id': id });

    const labelDiv = createElementWithAttributes('div', { 'slot': 'label' });
    const contentDiv = createElementWithAttributes('div', { 'slot': 'content' });

    widgetContainer.appendChild(labelDiv);
    widgetContainer.appendChild(contentDiv);

    let label, content;
    switch (type) {
        case WIDGET_TYPE.note:
            [label, content] = makeNoteWidget(id, a, b);
            labelDiv.appendChild(label);
            contentDiv.appendChild(content);
            break;

        case WIDGET_TYPE.steamGames:
            [label, content] = await makeSteamGamesWidget();
            labelDiv.appendChild(label);
            content.forEach(e => contentDiv.appendChild(e));
    }

    // 将 widget-container 添加到容器中
    widgetLayer.appendChild(widgetContainer);
}

// fn makeNoteWidget() -> [label, content]
function makeNoteWidget(id, a, b) {
    const labelP = createElementWithAttributes('p', {
        'contenteditable': 'true',
        'class': 'contenteditable padding_nowarp',
        'spellcheck': 'false',
        'widget-id': id,
        'data-key': 'a'
    });
    labelP.textContent = a ?? '';
    const contentP = createElementWithAttributes('p', {
        'contenteditable': 'true',
        'class': 'contenteditable',
        'spellcheck': 'false',
        'widget-id': id,
        'data-key': 'b'
    });
    contentP.textContent = b ?? '';
    return [labelP, contentP];
}

// fn makeSteamGamesWidget() -> [label, content]
async function makeSteamGamesWidget() {
    if (!window.mSGW_cache) {
        const arr = await invoke('get_steam_games');
        arr.sort((a, b) => b.last_played - a.last_played);
        window.mSGW_cache = arr;
    }

    const { SECOND, MINUTE, HOUR, DAY, WEEK, PLURAL, AGO } = window.LANG.DATETIME;

    const getStateStr = (stateNumStr) => {
        if (window.LANG.STEAM_GAME_STATE.hasOwnProperty(stateNumStr)) {
            return window.LANG.STEAM_GAME_STATE[stateNumStr];
        } else return window.LANG.STEAM_GAME_STATE["UNKNOWN"];
    };

    const getSizeStr = (byteNumStr) => {
        const B = Number.parseInt(byteNumStr);
        if (B < 1024) return `${B.toFixed(2)}B`;
        if (B < 1048576) return `${(B / 1024).toFixed(2)}KB`;
        if (B < 1073741824) return `${(B / 1048576).toFixed(2)}MB`;
        return `${(B / 1073741824).toFixed(2)}GB`;
    };

    const getLastPlayedStr = (LastPlayedNumStr) => {
        if (LastPlayedNumStr === '0') return window.LANG.STEAM_GAME_LASTPLAYED_NOT;
        const sec = Math.round(Date.now() / 1000) - Number.parseInt(LastPlayedNumStr);

        if (sec < 60) {
            return `${sec} ${SECOND}${sec === 1 ? '' : PLURAL}${AGO}`;
        } else if (sec < 3600) {
            const x = Math.round(sec / 60);
            return `${x} ${MINUTE}${x === 1 ? '' : PLURAL}${AGO}`;
        } else if (sec < 86400) {
            const x = Math.round(sec / 3600);
            return `${x} ${HOUR}${x === 1 ? '' : PLURAL}${AGO}`;
        } else if (sec < 604800) {
            const x = Math.round(sec / 86400);
            return `${x} ${DAY}${x === 1 ? '' : PLURAL}${AGO}`;
        } else {
            const x = Math.round(sec / 604800);
            return `${x} ${WEEK}${x === 1 ? '' : PLURAL}${AGO}`;
        }
    };

    // filter
    const steamGamefilterOut = ['228980'];

    const contentArr = [];

    for (const steamgame of window.mSGW_cache) {
        // filter out [228980]
        if (steamGamefilterOut.includes(steamgame.appid)) continue;

        const wrapper = createElementWithAttributes('div', { 'class': 'steamgameitem', "data-appid": steamgame.appid });
        // >
        const name = createElementWithAttributes('span', { 'class': 'steamgame_name' });
        name.textContent = steamgame.name;
        const info = createElementWithAttributes('span', { 'class': 'steamgame_state' });
        info.textContent = `${getLastPlayedStr(steamgame.last_played)} · ${getStateStr(steamgame.state_flags)} · ${getSizeStr(steamgame.size_on_disk)}`

        wrapper.appendChild(name);
        wrapper.appendChild(info);

        contentArr.push(wrapper);
    }

    const labelP = createElementWithAttributes('p', { 'class': 'padding_nowarp' });
    labelP.textContent = window.LANG.STEAM_CONTAINER_LABEL;

    return [labelP, contentArr];
}

function createElementWithAttributes(tagName, attributes) {
    const element = document.createElement(tagName);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    return element;
}

// bindEventListener
function bindEventListener() {
    // type: steamgames > Run game
    for (const item of document.querySelectorAll('.steamgameitem')) {
        item.addEventListener('click',
            () => {
                console.log(item.getAttribute("data-appid"));
                invoke('start_steam_game', { appid: item.getAttribute("data-appid") });
            }
        )
    }

    window.inputTimer = {};
    // type: note > save a / b
    for (const item of document.querySelectorAll('.contenteditable')) {
        item.addEventListener('input',
            (e) => {
                const id = e.target.getAttribute('widget-id'), key = e.target.getAttribute('data-key');
                clearTimeout(window.inputTimer[id + key]);
                window.inputTimer[id + key] = setTimeout(async () => {
                    console.log("input, save!");
                    await storedWidgets.set('data', (await storedWidgets.get('data')).map((v) => {
                        if (v['id'] == id) {
                            v[key] = e.target.innerText;
                        }
                        return v;
                    }));
                    await storedWidgets.save();
                }, 2000)
            }
        )
    }

    // document.addEventListener('contextmenu', (e) => {
    //     // right
    //     e.stopPropagation();
    // })
}

// 
// menu begin
// 
const aboveLayer = document.querySelector('#above_layer'), menu = document.querySelector('#menu');

function setAddWidgetMenu() {
    const itemArr = [['Note', createNoteWidget], ['Steam Games', createSteamGamesWidget]].map((arr) => {
        const ele = createElementWithAttributes('p', { 'class': 'menu-item' });
        ele.textContent = arr[0];
        ele.addEventListener('click', () => {
            closeMenu();
            arr[1]();
        });
        return ele;
    });

    document.querySelector('#addwidget_btn').addEventListener('mousedown', (e) => {
        const btn = e.currentTarget;
        showMenu(
            itemArr,
            btn.getBoundingClientRect(),
            () => btn.classList.add('topbar_ele_on'),
            () => btn.classList.remove('topbar_ele_on')
        );
    });
}

function showMenu(itemArr, rect, afterShowFn, afterCloseFn) {
    if (itemArr?.length > 0) {
        menu.innerHTML = '';
        itemArr.forEach((e) => menu.appendChild(e));
    }

    const { left, right, top, bottom } = rect;
    menu.style.left = `${(left + right) / 2}px`;
    menu.style.top = `${bottom + 6}px`;

    window.menu_after_close_fn = afterCloseFn;
    aboveLayer.style.pointerEvents = 'auto';
    aboveLayer.style.backdropFilter = 'blur(5px)';
    aboveLayer.addEventListener('click', closeMenu);
    menu.style.display = 'block';
    // afterShowFn()
    if (afterShowFn) afterShowFn();
    setTimeout(() => {
        menu.classList.add('show');
    });
}

function closeMenu() {
    aboveLayer.style.backdropFilter = aboveLayer.style.pointerEvents = '';
    menu.classList.remove('show');
    // afterCloseFn()
    if (window.menu_after_close_fn) window.menu_after_close_fn();
    window.menu_after_close_fn = null;
    setTimeout(() => {
        menu.style.display = '';
    }, 300);
}
// 
// menu end
// 
async function createNoteWidget() {
    const id = make_widgetID();
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.note, id: id, a: window.LANG.NOTE.UNTITLED, b: window.LANG.NOTE.UNTITLED_CONTENT });
    appendWidget(WIDGET_TYPE.note, id, window.LANG.NOTE.UNTITLED, window.LANG.NOTE.UNTITLED_CONTENT);
    // widgetLayer.innerHTML += makeNoteWidget(id, window.LANG.NOTE.UNTITLED, window.LANG.NOTE.UNTITLED_CONTENT);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

async function createSteamGamesWidget() {
    const id = make_widgetID();
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.steamGames, id: id });
    appendWidget(WIDGET_TYPE.steamGames, id);
    // widgetLayer.innerHTML += await makeSteamGamesWidget(id);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

function make_widgetID() {
    let res = 'xxxx.'.replace(/x/g, () => (Math.random() * 36 | 0).toString(36));
    return res + Date.now().toString(36)
}