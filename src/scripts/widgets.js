import { showMenu, closeMenu } from "./menu.js";

const invoke = window.__TAURI__.core.invoke;
const storedWidgets = new window.__TAURI_PLUGIN_STORE__.Store('widgets.bin');
const steamPath = (await (new window.__TAURI_PLUGIN_STORE__.Store('settings.bin')).get('data'))['steam_path'];
const hasSteam = steamPath !== 'NOTFOUND';

const WIDGET_TYPE = {
    steamGames: "steamgames",
    note: "note",
    clock: "clock"
};

const widgetLayer = document.getElementById('widget_layer');

if (hasSteam) { // watch and update steamgames state
    window.steamgames_state_change_listener = await window.__TAURI__.event.listen('steamgames-state-change', (event) => {
        clearTimeout(window.steamgames_state_change_settimeout);
        window.steamgames_state_change_settimeout = setTimeout(() => updateSteamGamesWidget(event.payload), 500);
    });

    setInterval(updateSteamgamesStates, 20000);
}

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
        bindEventListener(document);
    }

    setAddWidgetMenu();
}

async function appendWidget(type, id, a, b) {
    const widgetContainer = createElementWithAttributes('widget-container', { 'widget-id': id, 'type': type });

    if (type === WIDGET_TYPE.note || type === WIDGET_TYPE.steamGames) { // note steamGames
        const labelDiv = createElementWithAttributes('div', { 'slot': 'label' });
        const contentDiv = createElementWithAttributes('div', { 'slot': 'content' });

        let label, content;
        switch (type) {
            case WIDGET_TYPE.note:
                [label, content] = makeNoteWidget(id, a, b);
                labelDiv.appendChild(label);
                contentDiv.appendChild(content);
                break;

            case WIDGET_TYPE.steamGames:
                if (!hasSteam) return;
                [label, content] = await makeSteamGamesWidget();
                labelDiv.appendChild(label);
                content.forEach(e => contentDiv.appendChild(e));
        }

        setTimeout(() => {
            widgetContainer.appendChild(labelDiv);
            widgetContainer.appendChild(contentDiv);
            bindEventListener(widgetContainer);
        }, 10);

    } else if (type === WIDGET_TYPE.clock) { // clock
        const absoDiv = createElementWithAttributes('div', { 'slot': 'abso' });
        absoDiv.appendChild(makeClockWidget());
        setTimeout(() => widgetContainer.appendChild(absoDiv), 10);
    }

    widgetLayer.appendChild(widgetContainer);
    return widgetContainer;
}

// fn makeClockWidget() -> content
function makeClockWidget() {
    const contentDiv = createElementWithAttributes('div', { 'class': 'clock' });
    const clock_dial = createElementWithAttributes('img', { 'class': 'clock_dial', 'src': 'svg/clock_dial.svg' });
    const hour = createElementWithAttributes('img', { 'class': 'clock_hour', 'src': 'svg/hour.svg' });
    const minute = createElementWithAttributes('img', { 'class': 'clock_minute', 'src': 'svg/minute.svg' });
    const second = createElementWithAttributes('img', { 'class': 'clock_second', 'src': 'svg/second.svg' });

    contentDiv.appendChild(clock_dial);
    contentDiv.appendChild(hour);
    contentDiv.appendChild(minute);
    contentDiv.appendChild(second);

    return contentDiv;
}

// fn makeNoteWidget() -> [label, content]
function makeNoteWidget(id, a, b) {
    const labelP = createElementWithAttributes('p', {
        'contenteditable': 'true',
        'class': 'contenteditable padding_nowarp',
        'widget-id': id,
    });
    labelP['data-key'] = 'a';
    labelP.textContent = a ?? '';
    const contentP = createElementWithAttributes('p', {
        'contenteditable': 'true',
        'class': 'contenteditable',
        'widget-id': id,
    });
    contentP['data-key'] = 'b';
    contentP.textContent = b ?? '';
    return [labelP, contentP];
}

// fn makeSteamGamesWidget() -> [label, contentArr]
async function makeSteamGamesWidget(steamgamesArr) {
    window.steamgamesArr = steamgamesArr ?? await invoke('get_steam_games');
    window.steamgamesArr.sort((a, b) => b.last_played - a.last_played);

    const { SECOND, MINUTE, HOUR, DAY, WEEK, SECONDS, MINUTES, HOURS, DAYS, WEEKS, AGO } = window.LANG.DATETIME;

    const getStateStr = stateNumStr => {
        if (window.LANG.STEAM_GAME_STATE.hasOwnProperty(stateNumStr)) {
            return window.LANG.STEAM_GAME_STATE[stateNumStr];
        } else return window.LANG.STEAM_GAME_STATE["UNKNOWN"];
    };

    const getSizeStr = byteNumStr => {
        const B = Number.parseInt(byteNumStr);
        if (B < 1024) return `${B.toFixed(2)}B`;
        if (B < 1048576) return `${(B / 1024).toFixed(2)}KB`;
        if (B < 1073741824) return `${(B / 1048576).toFixed(2)}MB`;
        return `${(B / 1073741824).toFixed(2)}GB`;
    };

    const getLastPlayedStr = (LastPlayedNumStr, secondNow) => {
        if (LastPlayedNumStr === '0') return window.LANG.STEAM_GAME_LASTPLAYED_NOT;
        const sec = secondNow - Number.parseInt(LastPlayedNumStr);

        if (sec < 60) {
            return `${sec} ${sec === 1 ? SECOND : SECONDS}${AGO}`;
        } else if (sec < 3600) {
            const x = Math.round(sec / 60);
            return `${x} ${x === 1 ? MINUTE : MINUTES}${AGO}`;
        } else if (sec < 86400) {
            const x = Math.round(sec / 3600);
            return `${x} ${x === 1 ? HOUR : HOURS}${AGO}`;
        } else if (sec < 604800) {
            const x = Math.round(sec / 86400);
            return `${x} ${x === 1 ? DAY : DAYS}${AGO}`;
        } else {
            const x = Math.round(sec / 604800);
            return `${x} ${x === 1 ? WEEK : WEEKS}${AGO}`;
        }
    };

    const secondNow = Math.round(Date.now() / 1000);

    // filter
    const steamGamefilterOut = ['228980'];

    const contentArr = [];

    for (const steamgame of window.steamgamesArr) {
        // filter out [228980]
        if (steamGamefilterOut.includes(steamgame.appid)) continue;

        const wrapper = createElementWithAttributes('div', { 'class': 'steamgameitem' });
        wrapper['appid'] = steamgame.appid
        // >
        const name = createElementWithAttributes('span', { 'class': 'steamgame_name' });
        name.textContent = steamgame.name;
        const info = createElementWithAttributes('span', { 'class': 'steamgame_state' });
        info['last_played'] = steamgame.last_played;
        info['state_flags_str'] = getStateStr(steamgame.state_flags);
        info['size_on_disk_str'] = getSizeStr(steamgame.size_on_disk);
        info.updataState = function (secondNow) {
            this.innerHTML = `${getLastPlayedStr(this['last_played'], secondNow)} · ${this['state_flags_str']} · ${this['size_on_disk_str']}`;
        }
        info.updataState(secondNow);

        const libraryHero = window.__TAURI__.core.convertFileSrc(`${steamPath}\\appcache\\librarycache\\${steamgame.appid}_library_hero.jpg`);
        // test icon
        const icon = createElementWithAttributes(
            'img',
            {
                'class': 'steamgame_library_hero',
                'src': libraryHero,
                'loading': 'lazy',
            }
        );
        icon.onerror = function () { this.src = 'static/library_hero.png'; };

        wrapper.appendChild(name);
        wrapper.appendChild(info);
        wrapper.appendChild(icon);

        contentArr.push(wrapper);
    }

    const labelP = createElementWithAttributes('p', { 'class': 'padding_nowarp' });
    labelP.textContent = window.LANG.STEAM_CONTAINER_LABEL;

    return [labelP, contentArr];
}

async function updateSteamGamesWidget(payload) {
    let [, contentArr] = await makeSteamGamesWidget(payload);
    const contentSlot = document.querySelector(`widget-container[type="${WIDGET_TYPE.steamGames}"]>div[slot="content"]`);
    contentSlot.replaceChildren(...contentArr);
    bindEventListener(contentSlot);
}

function updateSteamgamesStates() {
    const secondNow = Math.round(Date.now() / 1000);
    document.querySelectorAll('span.steamgame_state').forEach((e) => e.updataState(secondNow));
}

export function createElementWithAttributes(tagName, attributes) {
    const element = document.createElement(tagName);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    return element;
}

// bindEventListener
function bindEventListener(fromElement) {
    // type: steamgames > Run game
    for (const item of fromElement.querySelectorAll('.steamgameitem')) {
        item.addEventListener('click',
            () => {
                invoke('start_steam_game', { appid: item['appid'] });
            }
        )
    }

    window.inputTimer = {};
    // type: note > save a / b
    for (const item of fromElement.querySelectorAll('.contenteditable')) {
        item.addEventListener('input',
            (e) => {
                const id = e.target.getAttribute('widget-id'), key = e.target['data-key'];
                clearTimeout(window.inputTimer[id + key]);
                window.inputTimer[id + key] = setTimeout(async () => {
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
}

function setAddWidgetMenu() {
    const itemArr = [
        [window.LANG['WIDGETS']['NOTE'], createNoteWidget],
        [window.LANG['WIDGETS']['CLOCK'], createClockWidget],
        [window.LANG['WIDGETS']['STEAMGAMES'], createSteamGamesWidget]
    ].map((arr) => {
        const ele = createElementWithAttributes('p', { 'class': 'menu-item' });
        ele.textContent = arr[0];
        ele.addEventListener('click', () => {
            closeMenu();
            arr[1]();
        });
        return ele;
    });

    document.getElementById('addwidget_btn').addEventListener('mousedown', (e) => {
        const btn = e.currentTarget;
        showMenu(
            window.LANG['ADD_WIDGET_MENU_TITLE'],
            itemArr,
            btn.getBoundingClientRect(),
            () => btn.classList.add('topbar_ele_on'),
            () => btn.classList.remove('topbar_ele_on')
        );
    });
}

export async function createNoteWidget(content, x_y) {
    const id = make_widgetID();
    storeNewWidget({ type: WIDGET_TYPE.note, id: id, a: window.LANG.NOTE.UNTITLED, b: content ?? window.LANG.NOTE.UNTITLED_CONTENT });
    const widgetContainer = await appendWidget(WIDGET_TYPE.note, id, window.LANG.NOTE.UNTITLED, content ?? window.LANG.NOTE.UNTITLED_CONTENT);

    if (x_y) {
        widgetContainer.style.left = x_y[0] + 'px';
        widgetContainer.style.top = x_y[1] + 'px';
        widgetContainer.saveWidgetsStyles();
    }
}

async function createClockWidget() {
    const id = make_widgetID();
    storeNewWidget({ type: WIDGET_TYPE.clock, id: id });
    await appendWidget(WIDGET_TYPE.clock, id);
}

async function createSteamGamesWidget() {
    if (!hasSteam) {
        alert(window.LANG.STEAM_NOT_FOUND);
        return;
    }
    if (document.querySelector(`widget-container[type="${WIDGET_TYPE.steamGames}"]`)) {
        alert(window.LANG.WIDGET_ALREADY_EXISTS);
        return;
    }
    const id = make_widgetID();
    storeNewWidget({ type: WIDGET_TYPE.steamGames, id: id });
    appendWidget(WIDGET_TYPE.steamGames, id);
}

async function storeNewWidget(obj) {
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push(obj);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

function make_widgetID() {
    let res = 'xxxx.'.replace(/x/g, () => (Math.random() * 36 | 0).toString(36));
    return res + Date.now().toString(36)
}