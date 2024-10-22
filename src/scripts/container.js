import { popLayer } from "./menu.js";

const { createStore } = window.__TAURI__.store;

const widgetDataStore = await createStore('widgets.bin');
const widgetStyleStore = await createStore('widgets_styles.bin');


export class WidgetContainer extends HTMLElement {
    constructor() {
        super();

        // shadow
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(document.getElementById('widget_container_template').content.cloneNode(true));

        // get layers / elements
        const aboveLayer = document.getElementById('above_layer'), widgetLayer = document.getElementById('widget_layer'), move = shadow.getElementById('move'), fold = shadow.getElementById('fold'), destory = shadow.getElementById('destory');
        // const locked = shadow.getElementById('locked'), unlocked = shadow.getElementById('unlocked');

        const setFront = () => {
            const oldIndex = this.style.zIndex;
            this.style.zIndex = 999;
            const allContainers = Array.from(this.parentElement.querySelectorAll('widget-container'));
            const zIndexArr = allContainers.map(c => c.style.zIndex);
            if (oldIndex >= Math.max(...zIndexArr)) return;

            zIndexArr.sort((a, b) => a - b);
            allContainers.forEach(c => c.style.zIndex = zIndexArr.indexOf(c.style.zIndex) + 1);
        }

        // drug event
        const margin = 8;
        const bigMargin = 16;

        // start move
        const onMouseDown = (event) => {
            const parent = this.parentElement;

            // 获取其他组件
            const allContainers = Array.from(parent.querySelectorAll('widget-container')).filter(c => c !== this);

            const offsetX = event.x - this.offsetLeft;
            const offsetY = event.y - this.offsetTop;

            this.isDragging = true;
            const onMouseMove = (event) => {
                if (!this.isDragging) return;

                // 父元素
                const parentRect = parent.getBoundingClientRect();

                // 计算新的位置
                let newLeft = Math.min(Math.max(0, event.x - offsetX), parentRect.width - this.offsetWidth);
                let newTop = Math.min(Math.max(0, event.y - offsetY), parentRect.height - this.offsetHeight);

                const rightX = newLeft + this.offsetWidth, bottomY = newTop + this.offsetHeight;
                let isBesideRightAngle, adsorbNum = 0;
                let broHozAlignment, broVerAlignment;

                // bros alignment
                for (const container of allContainers) {
                    const containerRect = container.getBoundingClientRect();
                    const ctnTop = containerRect.top - parentRect.top, ctnBottom = containerRect.bottom - parentRect.top, ctnLeft = containerRect.left, ctnRight = containerRect.right;

                    const hozIntersect = isIntersect([newLeft, rightX], [ctnLeft, ctnRight]);
                    const verIntersect = isIntersect([newTop, bottomY], [ctnTop, ctnBottom]);

                    // exclude
                    if (hozIntersect === verIntersect) {
                        continue;
                    } else {
                        if (hozIntersect) {
                            const gap = Math.max(ctnTop - bottomY, newTop - ctnBottom);

                            if (gap <= 2 * margin) {
                                adsorbNum++;
                                broHozAlignment = true;
                                isBesideRightAngle = isBesideRightAngle || container.style.borderRadius === '0px';
                                // bottom - top
                                if (ctnTop - bottomY >= 0) newTop = ctnTop - this.offsetHeight - margin;
                                // top - bottom
                                else newTop = ctnBottom + margin;

                                { // cross-axis alignment
                                    const leftDelta = abs(newLeft - ctnLeft),
                                        rightDelta = abs(rightX - ctnRight),
                                        centerDelta = abs(avg(newLeft, rightX) - avg(ctnLeft, ctnRight));
                                    const minDelta = Math.min(leftDelta, rightDelta, centerDelta);

                                    if (minDelta <= margin) {
                                        newLeft = minDelta === centerDelta ? avg(ctnLeft, ctnRight) - this.offsetWidth / 2
                                            : minDelta === leftDelta ? ctnLeft
                                                : ctnRight - this.offsetWidth;
                                    }
                                }
                            }
                        } else {
                            const gap = Math.max(ctnLeft - rightX, newLeft - ctnRight);

                            if (gap <= 2 * margin) {
                                adsorbNum++;
                                broHozAlignment = true;
                                isBesideRightAngle = isBesideRightAngle || container.style.borderRadius === '0px';
                                // right - left
                                if (ctnLeft - rightX >= 0) newLeft = ctnLeft - this.offsetWidth - margin;
                                // left - right
                                else newLeft = ctnRight + margin;

                                { // cross-axis alignment
                                    const topDelta = abs(newTop - ctnTop),
                                        bottomDelta = abs(bottomY - ctnBottom),
                                        centerDelta = abs(avg(newTop, bottomY) - avg(ctnTop, ctnBottom));
                                    const minDelta = Math.min(topDelta, bottomDelta, centerDelta);

                                    if (minDelta <= margin) {
                                        newTop = minDelta === topDelta ? ctnTop
                                            : minDelta === centerDelta ? avg(ctnTop, ctnBottom) - this.offsetHeight / 2
                                                : ctnBottom - this.offsetHeight;
                                    }
                                }
                            }
                        }
                    }
                }

                { // parent alignment
                    const leftGap = newLeft;
                    const topGap = newTop;
                    const rightGap = parent.offsetWidth - rightX;
                    const bottomGap = parent.offsetHeight - bottomY;
                    const minGap = Math.min(leftGap, topGap, rightGap, bottomGap);

                    this.style.borderRadius = (minGap < 1 || isBesideRightAngle) ? '0px' : '20px';

                    if (minGap < bigMargin && minGap >= margin / 2) {
                        if (!broHozAlignment) {
                            if (leftGap < bigMargin) newLeft = margin;
                            else if (rightGap < bigMargin) newLeft = parentRect.width - this.offsetWidth - margin;
                        }
                        if (!broVerAlignment) {
                            if (topGap < bigMargin) newTop = margin;
                            else if (bottomGap < bigMargin) newTop = parentRect.height - this.offsetHeight - margin;
                        }
                    }
                }

                // 更新组件的位置
                this.style.left = `${newLeft}px`;
                this.style.top = `${newTop}px`;
            };

            const onMouseUp = () => {
                this.isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Save Widgets Styles
                saveWidgetStyle(
                    this.getAttribute('widget-id'), this.style.left, this.style.top, this.style.borderRadius, this.style.zIndex, this.folding
                );
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        // 
        // concentrate
        // 
        const unConcentrate = () => {
            window.is_concentrating = false;
            aboveLayer.removeEventListener('mousedown', unConcentrate);
            this.classList.remove('concentrate');
            widgetLayer.insertBefore(this, null);
            if (window.setWidgetConcentrate) window.setWidgetConcentrate(this, false);
            popLayer(false);
        }
        const toConcentrate = () => {
            if (this.isDragging) return;
            window.is_concentrating = true;
            popLayer(true);
            aboveLayer.addEventListener('mousedown', unConcentrate);
            this.classList.add('concentrate');
            aboveLayer.insertBefore(this, null);
            // quit fold
            this.classList.remove('folding');
            if (window.setWidgetConcentrate) window.setWidgetConcentrate(this, true);
        }

        this.addEventListener('mousedown', e => {
            e.stopPropagation();
            if (!window.is_concentrating) setFront();
        });

        move.addEventListener('mousedown', e => {
            if (window.is_concentrating) {
                unConcentrate();
            } else {
                onMouseDown(e);
            }
        });

        move.addEventListener('dblclick', toConcentrate);

        // 
        // fold
        // 
        fold.addEventListener('click', () => this.folding = !this.folding);

        // 
        // locked & unlocked
        // 
        // locked.addEventListener('click', () => {
        //     locked.removeAttribute('hidden');
        //     unlocked.setAttribute('hidden', 'hidden');
        //     this._isLocked = false;
        // });
        // unlocked.addEventListener('click', () => {
        //     unlocked.removeAttribute('hidden');
        //     locked.setAttribute('hidden', 'hidden');
        //     this._isLocked = true;
        // });

        // 
        // destory self
        // 
        destory.addEventListener('click', async () => {
            if (window.is_concentrating) unConcentrate();
            this.remove();
            await widgetDataStore.set('data', (await widgetDataStore.get('data')).filter(obj => obj['id'] !== this.getAttribute('widget-id')));
            await widgetDataStore.save();

            saveAllWidgetsStylesFromDom();
        });
    }

    _isFolding = false;
    // _isLocked = false;

    get folding() {
        return this._isFolding;
    }

    set folding(bool) {
        if (window.is_concentrating) return;
        this._isFolding = bool;

        if (bool) {
            this.classList.add('folding');
        } else {
            this.classList.remove('folding');
        }

        saveWidgetStyle(
            this.getAttribute('widget-id'),
            this.style.left,
            this.style.top,
            this.style.borderRadius,
            this.style.zIndex,
            this.folding
        );
    }

    // dragging
    isDragging = false;

    async connectedCallback() {
        const setDefaultStyle = () => {
            this.style.left = '500px';
            this.style.top = '100px';
            this.style.borderRadius = '20px';
            this.style.zIndex = 998;
        }

        const widgetsObj = await widgetStyleStore.get('data');
        if (widgetsObj) {
            const styleArr = widgetsObj[this.getAttribute('widget-id')];
            if (styleArr) {
                this.style.left = styleArr[0];
                this.style.top = styleArr[1];
                this.style.borderRadius = styleArr[2];
                this.style.zIndex = styleArr[3];
                this.folding = styleArr[4];
            } else setDefaultStyle();
        } else setDefaultStyle();

        setTimeout(() => this.style.visibility = 'visible');
    }

    disconnectedCallback() {
        this.style.visibility = 'hidden';
    }
}

export async function saveWidgetStyle(id, left, top, borderRadius, zIndex, folding) {
    const widgetsObj = await widgetStyleStore.get('data');

    widgetsObj[id] = [
        left, top, borderRadius, zIndex, folding
    ];

    await widgetStyleStore.set('data', widgetsObj);
    await widgetStyleStore.save();
}

async function saveAllWidgetsStylesFromDom() {
    const widgetsObj = {};
    for (const c of document.querySelectorAll('widget-container')) {
        widgetsObj[c.getAttribute('widget-id')] = [
            c.style.left, c.style.top, c.style.borderRadius, c.style.zIndex, c.folding
        ];
    }

    await widgetStyleStore.set('data', widgetsObj);
    await widgetStyleStore.save();
}

function isIntersect([a1, a2], [b1, b2]) {
    return !((a1 < b1 && a2 <= b1) || (a1 >= b2 && a2 > b2));
}

function abs(num) {
    return num < 0 ? -1 * num : num;
}

function avg(a, b) {
    return (a + b) / 2;
}