class Game {
    constructor() {
        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1099bb
        });
        document.body.appendChild(this.app.view);

        this.maxCoins = 10;
        this.coinCount = 0;
        this.coins = [];
        this.coinTimers = [];

        PIXI.Loader.shared.add('coin', 'coin.png').load(() => this.setup());

    }

    setup() {
        this.app.view.addEventListener('click', () => this.addCoin());
        this.app.view.addEventListener('touchstart', () => this.addCoin());
        this.app.ticker.add(() => this.update());
    }

    addCoin() {
        if (this.coinCount >= this.maxCoins) return;

        const coin = new PIXI.Sprite(PIXI.Loader.shared.resources['coin'].texture);

        // Забезпечуємо, щоб монета з'являлася в межах екрану
        coin.x = Math.random() * (this.app.screen.width - coin.width);
        coin.y = -coin.height;
        coin.vy = 5;
        coin.reachedBottom = false;

        this.app.stage.addChild(coin);
        this.coins.push(coin);
        this.coinCount++;
    }

    update() {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];

            if (!coin.reachedBottom) {
                coin.y += coin.vy;

                // Логіка для обробки зіткнень з іншими монетами і рух по діагоналі
                for (let j = 0; j < this.coins.length; j++) {
                    if (i !== j) {
                        const otherCoin = this.coins[j];

                        if (
                            Math.abs(coin.x - otherCoin.x) < 40 &&
                            coin.y + coin.height > otherCoin.y &&
                            coin.y < otherCoin.y + otherCoin.height &&
                            otherCoin.reachedBottom
                        ) {
                            // Монета піднімається на 10 пікселів лише один раз
                            if (!coin.bounced) {
                                coin.y -= 10;
                                coin.bounced = true; // Відзначаємо, що монета відскочила
                                coin.vy = 1; // встановлення швидкості для руху вниз
                            }

                            // Перевірка наявності вільного місця праворуч
                            const rightSpaceFree = this.isSpaceFree(otherCoin.x + otherCoin.width, otherCoin.y);
                            // Перевірка наявності вільного місця ліворуч
                            const leftSpaceFree = this.isSpaceFree(otherCoin.x - otherCoin.width, otherCoin.y);

                            if (rightSpaceFree && coin.x + coin.width <= this.app.screen.width) {
                                // Якщо є місце праворуч, зміщуємо монету туди
                                coin.vx = 3; // встановлення горизонтальної швидкості
                            } else if (leftSpaceFree && coin.x >= 0) {
                                // Якщо є місце ліворуч, зміщуємо монету туди
                                coin.vx = -3; // встановлення горизонтальної швидкості
                            } else {
                                // Якщо немає місця праворуч і ліворуч, монета зупиняється
                                coin.vx = 0;
                                coin.y = otherCoin.y - coin.height * 0.8;
                                coin.reachedBottom = true;
                            }
                            break;
                        }
                    }
                }

                if (coin.diagonalMove) {
                    coin.x += coin.vx;
                    coin.y += coin.vy;

                    // Перевірка меж екрану
                    if (coin.x < 0) {
                        coin.x = 0;
                        coin.reachedBottom = true;
                    } else if (coin.x + coin.width > this.app.screen.width) {
                        coin.x = this.app.screen.width - coin.width;
                        coin.reachedBottom = true;
                    }

                    if (coin.y + coin.height >= this.app.screen.height) {
                        coin.y = this.app.screen.height - coin.height;
                        coin.reachedBottom = true;
                        setTimeout(() => this.removeCoin(coin), 5000);
                    }
                }

                // Якщо монета рухається по діагоналі
                if (coin.bounced && coin.vx !== 0) {
                    coin.x += coin.vx;
                    coin.y += coin.vy;

                    // Перевірка виходу за межі екрану
                    if (coin.x <= 0 || coin.x + coin.width >= this.app.screen.width) {
                        // Якщо монета досягає краю екрану, зупиняємо її горизонтальний рух
                        coin.vx = 0;
                    }

                    // Якщо монета досягає нижньої межі екрану
                    if (coin.y + coin.height >= this.app.screen.height) {
                        coin.y = this.app.screen.height - coin.height;
                        coin.reachedBottom = true;

                        // Запуск таймера на зникнення
                        const timerId = setTimeout(() => this.removeCoin(coin), 5000);
                        this.coinTimers.push({ coin, timerId });
                    }
                }
            }
        }

        this.handleCoinStacking();
    }

    isSpaceFree(x, y) {
        return !this.coins.some(coin => Math.abs(coin.x - x) < 40 && Math.abs(coin.y - y) < 55);
    }

    removeCoin(coin) {
        // Знаходимо і очищаємо відповідний таймер
        const timerObj = this.coinTimers.find(obj => obj.coin === coin);
        if (timerObj) {
            clearTimeout(timerObj.timerId);
            this.coinTimers = this.coinTimers.filter(obj => obj !== timerObj);
        }

        const coinIndex = this.coins.indexOf(coin);
        if (coinIndex !== -1) {
            this.app.stage.removeChild(coin);
            this.coins.splice(coinIndex, 1);
            this.coinCount--;

            // Логіка для відновлення падіння монет, які були над зниклою монетою
            for (let i = 0; i < this.coins.length; i++) {
                const aboveCoin = this.coins[i];
                if (Math.abs(aboveCoin.x - coin.x) < 40 && aboveCoin.y < coin.y) {
                    aboveCoin.reachedBottom = false; // Відновлення падіння монети
                }
            }
        }

        // Перевірка наявності монет, які можуть тепер продовжити рух вниз
        this.checkForFallingCoins();
    }

    checkForFallingCoins() {
        for (let i = 0; i < this.coins.length; i++) {
            const coin = this.coins[i];
            if (!coin.reachedBottom) {
                // Якщо під монетою зникла монета, перевіряємо, чи вона може рухатися вниз
                let canFall = true;
                for (let j = 0; j < this.coins.length; j++) {
                    const otherCoin = this.coins[j];
                    if (
                        i !== j &&
                        Math.abs(coin.x - otherCoin.x) < 40 &&
                        coin.y < otherCoin.y &&
                        coin.y + coin.height > otherCoin.y &&
                        otherCoin.reachedBottom
                    ) {
                        canFall = false;
                        break;
                    }
                }
                if (canFall) {
                    coin.reachedBottom = false;
                }
            }
        }
    }

    handleCoinStacking() {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];

            if (!coin.reachedBottom) {
                coin.y += coin.vy;

                // Перевірка, чи монета зупинилась на іншій монеті
                for (let j = 0; j < this.coins.length; j++) {
                    if (i !== j) {
                        const otherCoin = this.coins[j];

                        if (Math.abs(coin.x - otherCoin.x) < 40 &&
                            Math.abs(coin.y - otherCoin.y) < 55 &&
                            otherCoin.reachedBottom) {
                            // Перевірка наявності вільного місця праворуч
                            const rightSpaceFree = this.isSpaceFree(otherCoin.x + otherCoin.width, otherCoin.y);
                            // Перевірка наявності вільного місця ліворуч
                            const leftSpaceFree = this.isSpaceFree(otherCoin.x - otherCoin.width, otherCoin.y);

                            if (rightSpaceFree && coin.x + coin.width <= this.app.screen.width) {
                                // Якщо є місце праворуч, зміщуємо монету туди
                                coin.x = otherCoin.x + otherCoin.width;
                            } else if (leftSpaceFree && coin.x >= 0) {
                                // Якщо є місце ліворуч, зміщуємо монету туди
                                coin.x = otherCoin.x - otherCoin.width;
                            } else {
                                // Якщо немає місця праворуч і ліворуч, накладаємо на 20%
                                coin.y = otherCoin.y - coin.height * 0.8;
                                coin.reachedBottom = true;

                                // Запуск таймера на зникнення, якщо монета досягла дна
                                if (coin.y + coin.height >= this.app.screen.height) {
                                    setTimeout(() => this.removeCoin(coin), 1000);
                                }
                            }
                            break;
                        }
                    }
                }

                // Якщо монета досягає нижньої межі екрану
                if (coin.y + coin.height >= this.app.screen.height && !coin.reachedBottom) {
                    coin.y = this.app.screen.height - coin.height;
                    coin.reachedBottom = true;

                    // Запуск таймера на зникнення з очищенням попереднього
                    const timerId = setTimeout(() => this.removeCoin(coin), 5000);
                    this.coinTimers.push({ coin, timerId });
                }
            }
        }
    }
}

const game = new Game();












