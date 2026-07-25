const assert = require('assert');

const landscapeSeats = {
    2: [[0.22, 0.70], [0.78, 0.30]],
    3: [[0.22, 0.72], [0.22, 0.28], [0.78, 0.50]],
    4: [[0.22, 0.72], [0.22, 0.28], [0.78, 0.28], [0.78, 0.72]],
    5: [[0.19, 0.78], [0.19, 0.22], [0.50, 0.18], [0.81, 0.22], [0.81, 0.78]],
    6: [[0.19, 0.82], [0.19, 0.18], [0.50, 0.18], [0.81, 0.18], [0.81, 0.82], [0.50, 0.82]]
};

const intersects = (a, b, margin = 0) => (
    a.left < b.right + margin
    && a.right > b.left - margin
    && a.top < b.bottom + margin
    && a.bottom > b.top - margin
);

function simulate(width, height, playerCount) {
    const isMobile = Math.min(width, height) <= 768 && Math.max(width, height) <= 1024;
    const isLandscapeMobile = isMobile && width > height;
    assert(isMobile, `${width}x${height} should use the mobile layout`);

    const landscapeActionRail = isLandscapeMobile ? 168 : 0;
    const playfieldLeft = isLandscapeMobile ? 6 : 0;
    const playfieldRight = width - landscapeActionRail;
    const playfieldTop = isLandscapeMobile ? 54 : 60;
    const playfieldBottom = isLandscapeMobile ? height - 10 : height - 86;
    const playfieldWidth = playfieldRight - playfieldLeft;
    const playfieldHeight = playfieldBottom - playfieldTop;
    const cx = playfieldLeft + playfieldWidth / 2;
    const cy = playfieldTop + playfieldHeight / 2;
    const rx = Math.max(72, Math.min(playfieldWidth * 0.38, playfieldWidth / 2 - 50));
    const ry = Math.max(72, Math.min(
        playfieldHeight * (isLandscapeMobile ? 0.3 : 0.42),
        playfieldHeight / 2 - 66
    ));

    const cardWidth = width <= 390 ? 43 : 46;
    const cardHeight = width <= 390 ? 61 : 66;
    let scale = 1;
    if (isLandscapeMobile) scale *= 0.82;
    else if (height < 650) scale *= 0.9;
    if (playerCount >= 5) scale *= isLandscapeMobile ? 0.70 : 0.88;
    scale = Math.max(0.58, scale);

    const scaledCardWidth = cardWidth * scale;
    const scaledCardHeight = cardHeight * scale;
    const gap = Math.max(3, 4 * scale);
    const groupWidth = scaledCardWidth * 2 + gap;
    const groupHeight = scaledCardHeight * 2 + gap;
    const controlsBottom = isLandscapeMobile ? playfieldTop + 8 : 108;
    const playerRects = [];
    const badgeRects = [];

    for (let relIndex = 0; relIndex < playerCount; relIndex++) {
        const angle = Math.PI / 2 + relIndex * (2 * Math.PI / playerCount);
        const seat = isLandscapeMobile ? landscapeSeats[playerCount][relIndex] : null;
        let px = seat
            ? playfieldLeft + playfieldWidth * seat[0]
            : relIndex === 0 ? cx : cx + Math.cos(angle) * rx;
        let py = seat
            ? playfieldTop + playfieldHeight * seat[1]
            : relIndex === 0 ? cy + ry * 0.75 : cy + Math.sin(angle) * ry;

        const topLimit = controlsBottom + groupHeight / 2;
        const bottomPadding = relIndex === 0 ? (isLandscapeMobile ? 50 : 40) : 8;
        const bottomLimit = playfieldBottom - bottomPadding - groupHeight / 2;
        px = Math.max(
            playfieldLeft + 10 + groupWidth / 2,
            Math.min(playfieldRight - 10 - groupWidth / 2, px)
        );
        py = Math.max(topLimit, Math.min(bottomLimit, py));

        const playerRect = {
            left: px - groupWidth / 2,
            right: px + groupWidth / 2,
            top: py - groupHeight / 2,
            bottom: py + groupHeight / 2
        };
        playerRects.push(playerRect);

        let badgeX;
        let badgeY;
        if (isLandscapeMobile) {
            const isCenterSeat = Math.abs(px - cx) < groupWidth;
            if (isCenterSeat) {
                badgeX = px + groupWidth / 2 + 23;
                badgeY = py;
            } else {
                const horizontalDirection = px < cx ? -1 : 1;
                badgeX = px + horizontalDirection * (groupWidth / 2 + 23);
                badgeY = py;
            }
            badgeX = Math.max(playfieldLeft + 19, Math.min(playfieldRight - 19, badgeX));
            badgeY = Math.max(playfieldTop + 19, Math.min(playfieldBottom - 19, badgeY));
        } else if (relIndex === 0) {
            badgeX = px;
            badgeY = Math.min(playfieldBottom - 20, py + groupHeight / 2 + 24);
        } else {
            const radialX = px + Math.cos(angle) * (groupWidth / 2 + 24);
            const radialY = py + Math.sin(angle) * (groupHeight / 2 + 22);
            if (radialX < playfieldLeft + 22 || radialX > playfieldRight - 22) {
                badgeX = px;
                badgeY = Math.max(playfieldTop + 22, py - groupHeight / 2 - 26);
            } else {
                badgeX = radialX;
                badgeY = Math.max(playfieldTop + 22, Math.min(playfieldBottom - 22, radialY));
            }
        }
        const badgeTouchesCards = Math.abs(badgeX - px) < groupWidth / 2 + 19
            && Math.abs(badgeY - py) < groupHeight / 2 + 19;
        if (badgeTouchesCards) {
            const above = py - groupHeight / 2 - 26;
            const below = py + groupHeight / 2 + 26;
            badgeX = px;
            badgeY = above >= playfieldTop + 19
                ? above
                : Math.min(playfieldBottom - 19, below);
        }
        badgeRects.push({
            left: badgeX - 19,
            right: badgeX + 19,
            top: badgeY - 19,
            bottom: badgeY + 19
        });
    }

    const deckTop = cy - cardHeight / 2;
    const deckLeft = cx - 7 - cardWidth;
    const discardLeft = cx + 7;
    const deckRects = [
        { left: deckLeft, right: deckLeft + cardWidth, top: deckTop - 2.7, bottom: deckTop + cardHeight },
        { left: discardLeft, right: discardLeft + cardWidth, top: deckTop, bottom: deckTop + cardHeight }
    ];

    playerRects.forEach((playerRect, index) => {
        assert(playerRect.left >= playfieldLeft, `player ${index} escaped left at ${width}x${height}`);
        assert(playerRect.right <= playfieldRight, `player ${index} escaped right at ${width}x${height}`);
        assert(playerRect.top >= playfieldTop, `player ${index} escaped top at ${width}x${height}`);
        assert(playerRect.bottom <= playfieldBottom, `player ${index} escaped bottom at ${width}x${height}`);
        deckRects.forEach(deckRect => {
            assert(!intersects(playerRect, deckRect, 3), `deck overlaps player ${index} of ${playerCount} at ${width}x${height}`);
        });
        assert(!intersects(playerRect, badgeRects[index]), `badge overlaps player ${index} of ${playerCount} at ${width}x${height}`);
    });
    badgeRects.forEach((badgeRect, badgeIndex) => {
        playerRects.forEach((playerRect, playerIndex) => {
            assert(
                !intersects(badgeRect, playerRect),
                `badge ${badgeIndex} ${JSON.stringify(badgeRect)} overlaps player ${playerIndex} ${JSON.stringify(playerRect)} of ${playerCount} at ${width}x${height}`
            );
        });
        deckRects.forEach(deckRect => {
            assert(!intersects(badgeRect, deckRect), `badge ${badgeIndex} overlaps the deck at ${width}x${height}`);
        });
    });
}

const portraitSizes = [[320, 568], [360, 640], [390, 844], [430, 932]];
const landscapeSizes = portraitSizes.map(([width, height]) => [height, width]);

for (const [width, height] of [...portraitSizes, ...landscapeSizes]) {
    for (let players = 2; players <= 6; players++) simulate(width, height, players);
}

console.log('Responsive layout: 40 viewport/player-count combinations passed.');
