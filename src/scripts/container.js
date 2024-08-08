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
        shadow.addEventListener('mousedown', () => {
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
            const margin = 10;
            isDragging = true;
            const onMouseMove = (event) => {
                if (!isDragging) return;

                // 父元素
                const parentRect = this.parentElement.getBoundingClientRect();

                // 计算新的位置
                let newLeft = Math.min(Math.max(0, event.clientX - offsetX), parentRect.width - this.offsetWidth);
                let newTop = Math.min(Math.max(0, event.clientY - offsetY), parentRect.height - this.offsetHeight);

                let isBesideRightAngle;

                allContainers.forEach(container => {
                    const containerRect = container.getBoundingClientRect();
                    const newRect = {
                        leftX: newLeft,
                        topY: newTop,
                        rightX: newLeft + this.offsetWidth,
                        bottomY: newTop + this.offsetHeight
                    };

                    if (
                        (newRect.leftX - containerRect.right) < margin &&
                        (containerRect.left - newRect.rightX) < margin &&
                        (newRect.topY - containerRect.bottom) < margin &&
                        (containerRect.top - newRect.bottomY) < margin
                    ) {
                        isBesideRightAngle = container.style.borderRadius == '0px';

                        // 计算水平和垂直对齐
                        newLeft = Math.abs(newRect.leftX - containerRect.right) < margin ? containerRect.right : newLeft;
                        newLeft = Math.abs(newRect.rightX - containerRect.left) < margin ? containerRect.left - this.offsetWidth : newLeft;
                        newTop = Math.abs(newRect.topY - containerRect.bottom) < margin ? containerRect.bottom : newTop;
                        newTop = Math.abs(newRect.bottomY - containerRect.top) < margin ? containerRect.top - this.offsetHeight : newTop;
                    }
                });

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
        this.style.left = '160px';
        this.style.top = '80px';
        this.style.borderRadius = '20px';
        this.style.zIndex = 999;

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