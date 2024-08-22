const widgets = new window.__TAURI_PLUGIN_STORE__.Store('widgets.bin');
const widgetStore = new window.__TAURI_PLUGIN_STORE__.Store('widgets_styles.bin');

export class WidgetContainer extends HTMLElement {
    constructor() {
        super();
        // 创建一个shadow root并将其附加到自定义元素
        const shadow = this.attachShadow({ mode: 'open' });

        const template = document.getElementById('widget_container_template');
        const content = template.content.cloneNode(true);
        shadow.appendChild(content);

        // handle z-index
        this.addEventListener('mousedown', () => {
            const oldIndex = this.style.zIndex;
            this.style.zIndex = 999;
            const allContainers = Array.from(this.parentElement.querySelectorAll('widget-container'));
            const zIndexArr = allContainers.map(c => c.style.zIndex);
            if (oldIndex >= Math.max(...zIndexArr)) return;

            zIndexArr.sort((a, b) => a - b);
            allContainers.forEach(c => c.style.zIndex = zIndexArr.indexOf(c.style.zIndex) + 1);
        });

        // destory self
        shadow.getElementById('destory').addEventListener('click', async () => {
            widgets.set('data', (await widgets.get('data')).filter(obj => obj['id'] !== this.getAttribute('widget-id')));
            widgets.save();
            this.remove();
            this.saveWidgetsStyles();
        });

        // drug event
        let offsetX, offsetY, isDragging = false;

        shadow.getElementById('move').addEventListener('mousedown', (event) => {
            // 获取其他组件
            const allContainers = Array.from(this.parentElement.querySelectorAll('widget-container')).filter(c => c !== this);

            offsetX = event.clientX - this.offsetLeft;
            offsetY = event.clientY - this.offsetTop;

            // 确定接触边缘
            const margin = 8;
            isDragging = true;
            const onMouseMove = (event) => {
                if (!isDragging) return;

                // 父元素
                const parentRect = this.parentElement.getBoundingClientRect();

                // 计算新的位置
                let newLeft = Math.min(Math.max(0, event.clientX - offsetX), parentRect.width - this.offsetWidth);
                let newTop = Math.min(Math.max(0, event.clientY - offsetY), parentRect.height - this.offsetHeight);

                let isBesideRightAngle, adsorbNum = 0;

                for (const container of allContainers) {
                    const containerRect = container.getBoundingClientRect();
                    const rightX = newLeft + this.offsetWidth, bottomY = newTop + this.offsetHeight;

                    const hozIntersect = isIntersect([newLeft, rightX], [containerRect.left, containerRect.right]);
                    const verIntersect = isIntersect([newTop, bottomY], [containerRect.top, containerRect.bottom]);

                    // exclude
                    if (hozIntersect === verIntersect) {
                        continue;
                    } else {
                        if (hozIntersect) {
                            const gap = Math.max(containerRect.top - bottomY, newTop - containerRect.bottom);

                            if (gap < 2 * margin) {
                                adsorbNum++;
                                isBesideRightAngle = container.style.borderRadius === '0px';
                                // bottom - top
                                if (containerRect.top - bottomY >= 0) newTop = containerRect.top - this.offsetHeight - margin;
                                // top - bottom
                                else newTop = containerRect.bottom + margin;

                                { // cross-axis alignment
                                    const leftDelta = abs(newLeft - containerRect.left),
                                        rightDelta = abs(rightX - containerRect.right),
                                        centerDelta = abs(avg(newLeft, rightX) - avg(containerRect.left, containerRect.right));
                                    const minDelta = Math.min(leftDelta, rightDelta, centerDelta);

                                    if (minDelta < margin) {
                                        newLeft = minDelta === centerDelta ? avg(containerRect.left, containerRect.right) - this.offsetWidth / 2
                                            : minDelta === leftDelta ? containerRect.left
                                                : containerRect.right - this.offsetWidth;
                                    }
                                }
                                // break;
                            }
                        } else {
                            const gap = Math.max(containerRect.left - rightX, newLeft - containerRect.right);

                            if (gap < 2 * margin) {
                                adsorbNum++;
                                isBesideRightAngle = container.style.borderRadius === '0px';
                                // right - left
                                if (containerRect.left - rightX >= 0) newLeft = containerRect.left - this.offsetWidth - margin;
                                // left - right
                                else newLeft = containerRect.right + margin;

                                { // cross-axis alignment
                                    const topDelta = abs(newTop - containerRect.top),
                                        bottomDelta = abs(bottomY - containerRect.bottom),
                                        centerDelta = abs(avg(newTop, bottomY) - avg(containerRect.top, containerRect.bottom));
                                    const minDelta = Math.min(topDelta, bottomDelta, centerDelta);

                                    if (minDelta < margin) {
                                        newTop = minDelta === topDelta ? containerRect.top
                                            : minDelta === centerDelta ? avg(containerRect.top, containerRect.bottom) - this.offsetHeight / 2
                                                : containerRect.bottom - this.offsetHeight;
                                    }
                                }
                                // break;
                            }
                        }
                    }
                    if (adsorbNum === 4) break;
                }

                // 更新组件的位置
                this.style.left = `${newLeft}px`;
                this.style.top = `${newTop}px`;

                // 实时调整 border-radius
                const elemRect = this.getBoundingClientRect();
                const left = elemRect.left - parentRect.left;
                const top = elemRect.top - parentRect.top;
                const right = parentRect.right - elemRect.right;
                const bottom = parentRect.bottom - elemRect.bottom;

                const isNearEdge = Math.min(left, top, right, bottom) < 10;

                this.style.borderRadius = (isNearEdge || isBesideRightAngle) ? '0px' : '20px';

                if (isNearEdge) {
                    // 自动吸附到边缘
                    if (left < 10) this.style.left = '0px';
                    if (top < 10) this.style.top = '0px';
                    if (right < 10) this.style.left = `${parentRect.width - this.offsetWidth}px`;
                    if (bottom < 10) this.style.top = `${parentRect.height - this.offsetHeight}px`;
                }
            };

            const onMouseUp = async () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Save Widgets Styles
                this.saveWidgetsStyles();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    async connectedCallback() {
        this.style.left = '500px';
        this.style.top = '100px';
        this.style.borderRadius = '20px';
        this.style.zIndex = 100;

        const widgetsObj = await widgetStore.get('data');
        if (widgetsObj) {
            const styleArr = widgetsObj[this.getAttribute('widget-id')];
            if (styleArr) {
                this.style.left = styleArr[0];
                this.style.top = styleArr[1];
                this.style.borderRadius = styleArr[2];
                this.style.zIndex = styleArr[3];
            }
        }
    }

    async saveWidgetsStyles() {
        const widgetsObj = {};
        for (const c of document.querySelectorAll('widget-container')) {
            widgetsObj[c.getAttribute('widget-id')] = [c.style.left, c.style.top, c.style.borderRadius, c.style.zIndex];
        }

        await widgetStore.set('data', widgetsObj);
        await widgetStore.save();
    }
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