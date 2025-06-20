document.addEventListener('DOMContentLoaded', async () => {
    let vocabulary = {};
    let wordsList = [];
    let currentPuzzle;
    let activeCell = null;
    let difficulty = 0.15; // Default to Medium

    const gridElement = document.getElementById('crossword-grid');
    const cluesList = document.getElementById('horizontal-clues-list');
    const virtualKeyboard = document.getElementById('virtual-keyboard');
    const resetBtn = document.getElementById('reset-btn');
    const completionOverlay = document.getElementById('completion-overlay');
    const difficultyButtons = document.getElementById('difficulty-buttons');
    const confettiContainer = document.getElementById('confetti-container');

    async function fetchVocabulary() {
        try {
            const response = await fetch('vocabulary.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            vocabulary = await response.json();
            wordsList = Object.keys(vocabulary);
            if (wordsList.length < 300) {
                console.warn("Vocabulary contains fewer than 300 words. Consider expanding the list.");
            }
            return true;
        } catch (error) {
            console.error("Could not fetch vocabulary:", error);
            vocabulary = { 'SLOVO': ['Základní jednotka jazyka'] };
            wordsList = Object.keys(vocabulary);
            alert("Chyba při načítání slovní zásoby. Hra bude mít omezenou funkčnost.");
            return false;
        }
    }

    function setupInputEventListeners() {
        gridElement.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' && !e.target.disabled) {
                activeCell = e.target;
            }
        });

        // Handle physical keyboard input
        gridElement.addEventListener('keydown', e => {
            if (!activeCell) return;
            
            if (e.key === 'Backspace') {
                if (activeCell.value === '') {
                    e.preventDefault();
                    const enabledInputs = Array.from(gridElement.querySelectorAll('input:not([disabled])'));
                    const currentIndex = enabledInputs.indexOf(activeCell);
                    if (currentIndex > 0) {
                        const prevInput = enabledInputs[currentIndex - 1];
                        prevInput.focus();
                        prevInput.value = '';
                    }
                }
                return;
            }
            
            // Check if it's a valid letter
            if (/^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]$/.test(e.key)) {
                e.preventDefault(); // Prevent default to handle it ourselves
                
                // Set the value (overwriting any existing letter)
                activeCell.value = e.key.toUpperCase();
                
                // Move to next cell
                const enabledInputs = Array.from(gridElement.querySelectorAll('input:not([disabled])'));
                const currentIndex = enabledInputs.indexOf(activeCell);
                if (currentIndex < enabledInputs.length - 1) {
                    enabledInputs[currentIndex + 1].focus();
                }
                
                // Check if puzzle is complete
                checkIfPuzzleComplete();
            }
        });
    }
    
    function checkIfPuzzleComplete() {
        const enabledInputs = Array.from(gridElement.querySelectorAll('input:not([disabled])'));
        if (enabledInputs.every(input => input.value !== '')) {
            checkPuzzle();
        }
    }

    async function init() {
        const vocabLoaded = await fetchVocabulary();
        if (vocabLoaded) {
            createKeyboard();
            setupInputEventListeners();
            difficultyButtons.addEventListener('click', (e) => {
                if (e.target.closest('button')) {
                    const button = e.target.closest('button');
                    difficulty = parseFloat(button.dataset.value);
                    Array.from(difficultyButtons.children).forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    generateAndLoadPuzzle();
                }
            });
            difficultyButtons.querySelector('[data-value="0.15"]').classList.add('active');
            generateAndLoadPuzzle();

            completionOverlay.addEventListener('click', () => {
                completionOverlay.classList.add('hidden');
            });
        }
    }

    function generateAndLoadPuzzle() {
        currentPuzzle = generatePuzzle(50);
        if (currentPuzzle) {
            loadPuzzle(currentPuzzle);
            completionOverlay.classList.add('hidden');
        } else {
            alert("Nepodařilo se vygenerovat tajenku. Zkuste to prosím znovu.");
        }
    }
    
    function generatePuzzle(maxAttempts) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];
            if(secretWord.length < 3) continue;

            const plannedWords = [];
            let generationSuccess = true;

            for (let i = 0; i < secretWord.length; i++) {
                const char = secretWord[i];
                const possibleWords = wordsList.filter(w => 
                    w !== secretWord && 
                    w.includes(char) && 
                    !plannedWords.some(p => p.word === w)
                );
                if (possibleWords.length === 0) {
                    generationSuccess = false;
                    break;
                }
                const word = possibleWords[Math.floor(Math.random() * possibleWords.length)];
                const charIndex = word.indexOf(char);
                plannedWords.push({ word, rowIndex: i, charIndex });
            }

            if (generationSuccess) {
                const answerColumn = Math.max(...plannedWords.map(p => p.charIndex));
                const gridCols = answerColumn + Math.max(...plannedWords.map(p => p.word.length - p.charIndex));
                const gridRows = secretWord.length;

                const puzzleWords = plannedWords.map(p => ({
                    word: p.word,
                    clue: vocabulary[p.word][Math.floor(Math.random() * vocabulary[p.word].length)],
                    row: p.rowIndex,
                    col: answerColumn - p.charIndex
                }));

                return { secretWord, words: puzzleWords, gridRows, gridCols, answerColumn };
            }
        }
        return null;
    }

    function loadPuzzle(puzzle) {
        gridElement.innerHTML = '';
        gridElement.style.gridTemplateColumns = `repeat(${puzzle.gridCols + 1}, 1fr)`;
        gridElement.style.gridTemplateRows = `repeat(${puzzle.gridRows}, 1fr)`;

        const grid = Array.from({ length: puzzle.gridRows }, () => Array(puzzle.gridCols).fill(null));
        
        puzzle.words.forEach(wordInfo => {
            for (let i = 0; i < wordInfo.word.length; i++) {
                const r = wordInfo.row;
                const c = wordInfo.col + i;
                const isAnswerCell = (c === puzzle.answerColumn);
                grid[r][c] = { correct: wordInfo.word[i], isAnswer: isAnswerCell };
            }
        });

        const cellsToHint = new Set();
        if (difficulty > 0) {
            puzzle.words.forEach(wordInfo => {
                const potentialHintCells = [];
                for (let i = 0; i < wordInfo.word.length; i++) {
                    const c = wordInfo.col + i;
                    if (c !== puzzle.answerColumn) {
                        potentialHintCells.push({ r: wordInfo.row, c: c });
                    }
                }

                let hintCountForThisWord = 0;
                if (difficulty === 0.25) { // Easiest
                    const baseHints = Math.ceil(wordInfo.word.length * 0.33);
                    const maxHints = Math.floor(wordInfo.word.length / 2);
                    hintCountForThisWord = Math.min(baseHints + 1, maxHints);
                } else if (difficulty === 0.15) { // Medium
                    hintCountForThisWord = 1;
                }

                potentialHintCells.sort(() => Math.random() - 0.5); // Shuffle
                for (let i = 0; i < hintCountForThisWord && i < potentialHintCells.length; i++) {
                    const cell = potentialHintCells[i];
                    cellsToHint.add(`${cell.r},${cell.c}`);
                }
            });
        }

        const wordStarts = new Map();
        puzzle.words.forEach((word, index) => {
            wordStarts.set(word.row, {index: index + 1, placed: false});
        });

        for (let r = 0; r < puzzle.gridRows; r++) {
            for (let c = 0; c < puzzle.gridCols + 1; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');

                if (c === 0 && wordStarts.has(r)) {
                    const wordStartInfo = wordStarts.get(r)
                    if (!wordStartInfo.placed) {
                        cell.classList.add('clue-number-cell');
                        const clueNumberDiv = document.createElement('div');
                        clueNumberDiv.textContent = wordStartInfo.index;
                        cell.appendChild(clueNumberDiv);
                        wordStartInfo.placed = true;
                    }
                } else {
                    const gridC = c - 1;
                    const cellInfo = grid[r][gridC];
                    if (cellInfo) {
                        const input = document.createElement('input');
                        input.setAttribute('maxlength', 1);
                        input.dataset.correct = cellInfo.correct;
                        
                        if (cellsToHint.has(`${r},${gridC}`)) {
                            input.value = cellInfo.correct;
                            input.disabled = true; 
                        }

                        if (cellInfo.isAnswer) {
                            cell.classList.add('answer-cell');
                        }
                        cell.appendChild(input);
                    } else {
                        cell.classList.add('empty');
                    }
                }
                gridElement.appendChild(cell);
            }
        }
        
        cluesList.innerHTML = '';
        puzzle.words.forEach((wordInfo, index) => {
            const clueItem = document.createElement('li');
            clueItem.innerHTML = `<span>${index + 1}. ${wordInfo.clue}</span>`;

            // Only show hint button if difficulty is not the hardest (0)
            if (difficulty !== 0) {
                const hintButton = document.createElement('button');
                hintButton.textContent = '💡';
                hintButton.classList.add('hint-button');
                hintButton.addEventListener('click', () => revealHint(wordInfo));
                clueItem.appendChild(hintButton);
            }
            
            cluesList.appendChild(clueItem);
        });
    }

    function revealHint(wordInfo) {
        const wordCells = [];
        for (let i = 0; i < wordInfo.word.length; i++) {
            const r = wordInfo.row;
            const c = wordInfo.col + i;

            if (c === currentPuzzle.answerColumn) continue;

            const cellIndex = r * (currentPuzzle.gridCols + 1) + (c + 1);
            const cell = gridElement.children[cellIndex];
            if (cell) {
                const input = cell.querySelector('input');
                if (input && !input.value) {
                    wordCells.push({input, correct: wordInfo.word[i]});
                }
            }
        }

        if (wordCells.length > 0) {
            const randomIndex = Math.floor(Math.random() * wordCells.length);
            const cellToReveal = wordCells[randomIndex];
            cellToReveal.input.value = cellToReveal.correct;
            cellToReveal.input.disabled = true;
        }
    }

    function createKeyboard() {
        virtualKeyboard.innerHTML = '';
    
        const keyboardHeader = document.createElement('div');
        keyboardHeader.classList.add('keyboard-header');
    
        const icon = document.createElement('span');
        icon.textContent = '⌨️';
        icon.classList.add('keyboard-icon');
        keyboardHeader.appendChild(icon);
    
        const toggleLabel = document.createElement('label');
        toggleLabel.classList.add('keyboard-toggle');
        
        const toggleCheckbox = document.createElement('input');
        toggleCheckbox.type = 'checkbox';
        toggleCheckbox.checked = true;
        
        const toggleSlider = document.createElement('span');
        toggleSlider.classList.add('slider');
    
        toggleLabel.appendChild(toggleCheckbox);
        toggleLabel.appendChild(toggleSlider);
        keyboardHeader.appendChild(toggleLabel);
    
        virtualKeyboard.appendChild(keyboardHeader);
    
        const keysContainer = document.createElement('div');
        keysContainer.classList.add('keys-container');
        
        toggleCheckbox.addEventListener('change', () => {
            keysContainer.classList.toggle('hidden', !toggleCheckbox.checked);
        });
    
        const czechAlphabet = 'AÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPQRŘSŠTŤUÚŮVWXYÝZŽ';
        czechAlphabet.split('').forEach(char => {
            const key = document.createElement('button');
            key.textContent = char;
            key.addEventListener('click', () => {
                if (activeCell && !activeCell.disabled) {
                    // Set the value (overwriting any existing letter)
                    activeCell.value = char;
    
                    const enabledInputs = Array.from(gridElement.querySelectorAll('input:not([disabled])'));
                    const currentIndex = enabledInputs.indexOf(activeCell);
    
                    if (currentIndex < enabledInputs.length - 1) {
                        enabledInputs[currentIndex + 1].focus();
                    }
    
                    // Check if puzzle is complete
                    checkIfPuzzleComplete();
                }
            });
            keysContainer.appendChild(key);
        });
        virtualKeyboard.appendChild(keysContainer);
    }
    
    function checkPuzzle() {
        let allWordsCorrect = true;
        const inputs = gridElement.querySelectorAll('input:not([disabled])');

        inputs.forEach(input => {
            input.classList.remove('correct-answer', 'incorrect-answer');
            if (input.value.toUpperCase() === input.dataset.correct) {
                input.classList.add('correct-answer');
            } else {
                input.classList.add('incorrect-answer');
                allWordsCorrect = false;
            }
        });
        
        if (allWordsCorrect) {
            document.getElementById('star-rating').textContent = '🏆 ' + currentPuzzle.secretWord;
            gridElement.querySelectorAll('input').forEach(i => i.disabled = true);
            completionOverlay.classList.remove('hidden');
            launchConfetti();
        }
    }

    function launchConfetti() {
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            confettiContainer.appendChild(confetti);

            confetti.addEventListener('animationend', () => {
                confetti.remove();
            });
        }
    }

    resetBtn.addEventListener('click', generateAndLoadPuzzle);

    init();
});