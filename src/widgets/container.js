let widgetStore = new window.__TAURI_PLUGIN_STORE__.Store('widget.bin');

class Container extends HTMLElement {
    constructor() {
        super();
        // 创建一个shadow root并将其附加到自定义元素
        const shadow = this.attachShadow({ mode: 'open' });

        const template = document.getElementById('container_template');
        const content = template.content.cloneNode(true);
        shadow.appendChild(content);

        // drug event
        const label = shadow.getElementById('label');
        let offsetX, offsetY, isDragging = false;

        label.addEventListener('mousedown', (event) => {
            this.style.zIndex = 2;

            isDragging = true;
            offsetX = event.clientX - this.offsetLeft;
            offsetY = event.clientY - this.offsetTop;

            const onMouseMove = (event) => {
                if (!isDragging) return;

                // 获取父元素
                const parent = this.parentElement;
                const parentRect = parent.getBoundingClientRect();

                // 计算新的位置
                let newLeft = Math.min(Math.max(0, event.clientX - offsetX - parentRect.left), parentRect.width - this.offsetWidth);
                let newTop = Math.min(Math.max(0, event.clientY - offsetY - parentRect.top), parentRect.height - this.offsetHeight);

                // 获取其他组件
                const allContainers = Array.from(parent.querySelectorAll('widget-container')).filter(c => c !== this);

                let isBesideRightAngle;

                allContainers.forEach(container => {
                    container.style.zIndex = 1;
                    const containerRect = container.getBoundingClientRect();
                    const newRect = {
                        left: newLeft + parentRect.left,
                        top: newTop + parentRect.top,
                        right: newLeft + parentRect.left + this.offsetWidth,
                        bottom: newTop + parentRect.top + this.offsetHeight
                    };

                    const overlap = (
                        newRect.left < containerRect.right &&
                        newRect.right > containerRect.left &&
                        newRect.top < containerRect.bottom &&
                        newRect.bottom > containerRect.top
                    );

                    if (overlap) {
                        if (container.style.borderRadius == '0px') {
                            isBesideRightAngle = true;
                        }

                        // 确定接触边缘
                        const margin = 30;

                        // 计算水平和垂直对齐
                        const alignLeft = Math.abs(newRect.left - containerRect.right) < margin;
                        const alignRight = Math.abs(newRect.right - containerRect.left) < margin;
                        const alignTop = Math.abs(newRect.top - containerRect.bottom) < margin;
                        const alignBottom = Math.abs(newRect.bottom - containerRect.top) < margin;

                        if (alignLeft) newLeft = containerRect.right - parentRect.left;
                        if (alignRight) newLeft = containerRect.left - parentRect.left - this.offsetWidth;
                        if (alignTop) newTop = containerRect.bottom - parentRect.top;
                        if (alignBottom) newTop = containerRect.top - parentRect.top - this.offsetHeight;
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
                this.style.borderRadius = isNearEdge || isBesideRightAngle ? '0px' : '20px';

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

                await widgetStore.set(
                    this.getAttribute('widget-id'),
                    [this.style.left, this.style.top, this.style.borderRadius],
                );
                await widgetStore.save();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    async connectedCallback() {
        const posArr = await widgetStore.get(this.getAttribute('widget-id'));

        if (posArr) {
            this.style.left = posArr[0];
            this.style.top = posArr[1];
            this.style.borderRadius = posArr[2];
        } else {
            this.style.left = `${(parentRect.width - this.offsetWidth) / 2}px`;
            this.style.top = `${(parentRect.height - this.offsetHeight) / 2}px`;
            this.style.borderRadius = '20px'; // 初始边框圆角
        }

    }
}

// 定义自定义元素
customElements.define('widget-container', Container);