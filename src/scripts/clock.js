function updateClock() {
    const secondHand = document.querySelectorAll('.clock_second');
    const minuteHand = document.querySelectorAll('.clock_minute');
    const hourHand = document.querySelectorAll('.clock_hour');

    if (secondHand) {
        const now = new Date();
        const second = now.getSeconds();
        const minute = now.getMinutes();
        const hour = now.getHours();

        // 计算旋转角度
        const secondDegree = second * 6; // 每秒钟旋转6度
        const minuteDegree = minute * 6 + second * 0.1; // 每分钟旋转6度，每秒钟增加0.1度
        const hourDegree = hour * 30 + minute * 0.5; // 每小时旋转30度，每分钟增加0.5度

        secondHand.forEach((e) => e.style.transform = `rotate(${secondDegree}deg)`);
        minuteHand.forEach((e) => e.style.transform = `rotate(${minuteDegree}deg)`);
        hourHand.forEach((e) => e.style.transform = `rotate(${hourDegree}deg)`);
    }
}

updateClock();
setInterval(updateClock, 1000);