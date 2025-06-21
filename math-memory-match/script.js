const gameBoard = document.getElementById('game-board');

let cards = [];
let flippedCards = [];
let matchedCards = [];

function createCard(content) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.content = content;

    const cardFace = document.createElement('div');
    cardFace.classList.add('card-face', 'card-front');

    const cardBack = document.createElement('div');
    cardBack.classList.add('card-face', 'card-back');
    cardBack.textContent = content;

    card.appendChild(cardFace);
    card.appendChild(cardBack);

    card.addEventListener('click', () => {
        if (flippedCards.length < 2 && !flippedCards.includes(card) && !matchedCards.includes(card)) {
            flipCard(card);
            flippedCards.push(card);

            if (flippedCards.length === 2) {
                setTimeout(checkForMatch, 1000);
            }
        }
    });

    return card;
}

function flipCard(card) {
    card.classList.toggle('flipped');
}

function checkForMatch() {
    const [card1, card2] = flippedCards;
    const content1 = card1.dataset.content;
    const content2 = card2.dataset.content;

        let result1, result2;
    try {
        result1 = eval(content1);
    } catch { result1 = parseInt(content1); }

    try {
        result2 = eval(content2);
    } catch { result2 = parseInt(content2); }

    if (result1 === result2) {
        matchedCards.push(card1, card2);
    } else {
        flipCard(card1);
        flipCard(card2);
    }

    flippedCards = [];
}

function initGame() {
    const problems = ['2 + 2', '3 * 4', '9 - 1', '8 / 2', '5 + 6', '7 * 3', '10 - 5', '12 / 4'];
    const solutions = ['4', '12', '8', '4', '11', '21', '5', '3'];
    cards = [...problems, ...solutions];
    cards.sort(() => Math.random() - 0.5);

    cards.forEach(content => {
        const card = createCard(content);
        gameBoard.appendChild(card);
    });
}

initGame();