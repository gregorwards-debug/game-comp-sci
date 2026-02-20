import { CARD_TYPES } from './cards.js';

function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function createElement(tag, classNames = '', textContent = '') {
  const el = document.createElement(tag);
  if (classNames) {
    classNames.split(' ').forEach(cls => {
      if (cls) el.classList.add(cls);
    });
  }
  if (textContent) {
    el.textContent = textContent;
  }
  return el;
}

function renderGame(state, callbacks) {
  renderHeader(state);
  renderCPUPlayers(state);
  renderStatusBanner(state);
  renderPiles(state);
  renderViltrumiteAttackPlacement(state, callbacks);
  renderPlayerSidebar(state, callbacks);
  renderModals(state, callbacks);
}

function renderHeader(state) {
  const turnCounter = document.getElementById('turn-counter');
  turnCounter.textContent = `Turn ${state.turnNumber}`;
  turnCounter.className = 'turn-counter';

  const playerName = document.getElementById('current-player-name');
  playerName.className = 'current-player-indicator';

  if (state.gameover) {
    playerName.textContent = 'Game Over!';
  } else if (state.currentPlayer === 0) {
    playerName.textContent = `${state.players[0].name.toUpperCase()}'S TURN!`;
    playerName.classList.add('text-retro-green');
  } else {
    const cpuName = state.players[state.currentPlayer].name;
    playerName.textContent = `${cpuName} is thinking...`;
  }
}

function renderCPUPlayers(state) {
  const list = document.getElementById('cpu-players-list');
  clearElement(list);

  for (let i = 1; i <= 3; i++) {
    const player = state.players[i];
    const card = createElement('div', 'cpu-player-card');

    if (state.currentPlayer === i && !player.isEliminated) {
      card.classList.add('active');
    }

    if (player.isEliminated) {
      card.classList.add('eliminated');
    }

    const nameDiv = createElement('div', 'player-name');
    nameDiv.textContent = `${player.name}`;
    card.appendChild(nameDiv);

    const infoDiv = createElement('div', 'player-info');

    const cardCount = createElement('span', '', `\u{1F0CF} ${player.hand.length} cards`);
    infoDiv.appendChild(cardCount);

    const badge = createElement('span', 'status-badge');
    if (player.isEliminated) {
      badge.classList.add('eliminated');
      badge.textContent = 'ELIMINATED';
    } else {
      badge.classList.add('alive');
      badge.textContent = 'ALIVE';
    }
    infoDiv.appendChild(badge);

    card.appendChild(infoDiv);

    if (state.pendingPlayer === i && state.pendingViltrumiteAttack) {
      const placing = createElement('div', 'thinking-text', 'PLACING VILTRUMITE ATTACK...');
      card.appendChild(placing);
    } else if (state.currentPlayer === i && !player.isEliminated) {
      const thinking = createElement('div', 'thinking-text', 'THINKING...');
      card.appendChild(thinking);
    }

    list.appendChild(card);
  }
}

function renderStatusBanner(state) {
  const banner = document.getElementById('status-banner');
  clearElement(banner);
  banner.className = '';

  const humanPlayer = state.players[0];

  if (state.pendingViltrumiteAttack && state.pendingPlayer === 0) {
    banner.className = 'status-banner hero-assist';
    banner.textContent = `${humanPlayer.name} countered it! Choose where to place the Viltrumite Attack...`;
    return;
  }

  if (state.pendingViltrumiteAttack && state.pendingPlayer !== null && state.pendingPlayer !== 0) {
    const cpuName = state.players[state.pendingPlayer].name;
    banner.className = 'status-banner hero-assist';
    banner.textContent = `${cpuName} countered it! They're placing the Viltrumite Attack...`;
    return;
  }

  if (state.favorTarget === 0 && state.pendingFavor !== null) {
    const requesterName = state.players[state.pendingFavor].name;
    banner.className = 'status-banner favor';
    banner.textContent = `Choose a card to give to ${requesterName}`;
    return;
  }

  if (humanPlayer.isEliminated) {
    banner.className = 'status-banner elimination';
    banner.textContent = `${humanPlayer.name} has been eliminated! \u{1F480}`;
    return;
  }

  if (state.currentPlayer === 0 && !state.gameover) {
    banner.className = 'status-banner neutral';
    banner.textContent = `${humanPlayer.name}'s turn - play a card or draw`;
    return;
  }

  if (!state.gameover && state.currentPlayer !== 0) {
    const cpuName = state.players[state.currentPlayer].name;
    banner.className = 'status-banner neutral';
    banner.textContent = `${cpuName} is thinking...`;
    return;
  }

  banner.className = '';
}

function renderPiles(state) {
  const drawCount = document.getElementById('draw-count');
  drawCount.textContent = state.deck.length;

  const discardEmoji = document.getElementById('discard-emoji');
  const discardName = document.getElementById('discard-name');
  const discardCount = document.getElementById('discard-count');

  if (state.discardPile.length > 0) {
    const topCard = state.discardPile[state.discardPile.length - 1];
    discardEmoji.textContent = topCard.emoji;
    discardName.textContent = topCard.name;
    discardCount.textContent = state.discardPile.length;
  } else {
    discardEmoji.textContent = '\u{1F4C2}';
    discardName.textContent = '';
    discardCount.textContent = '0';
  }
}

function renderViltrumiteAttackPlacement(state, callbacks) {
  const placement = document.getElementById('viltrumite-attack-placement');
  const buttons = document.getElementById('placement-buttons');

  if (state.pendingViltrumiteAttack && state.pendingPlayer === 0) {
    placement.classList.remove('hidden');
    placement.className = 'viltrumite-attack-placement-bar';
    clearElement(buttons);
    buttons.className = 'viltrumite-attack-placement-buttons';

    const topBtn = createElement('button', '', '\u{1F51D} TOP (EVIL!)');
    topBtn.addEventListener('click', () => callbacks.onPlaceViltrumiteAttack(0));
    buttons.appendChild(topBtn);

    const midPosition = Math.floor(state.deck.length / 2);
    const midBtn = createElement('button', '', '\u{2195}\u{FE0F} MIDDLE');
    midBtn.addEventListener('click', () => callbacks.onPlaceViltrumiteAttack(midPosition));
    buttons.appendChild(midBtn);

    const bottomBtn = createElement('button', '', '\u{2B07}\u{FE0F} BOTTOM (SAFE)');
    bottomBtn.addEventListener('click', () => callbacks.onPlaceViltrumiteAttack(state.deck.length));
    buttons.appendChild(bottomBtn);
  } else {
    placement.className = 'hidden';
  }
}

function renderPlayerSidebar(state, callbacks) {
  const humanPlayer = state.players[0];

  const handCount = document.getElementById('hand-count');
  handCount.textContent = `(${humanPlayer.hand.length} cards)`;

  const playerStatus = document.getElementById('player-status');
  if (humanPlayer.isEliminated) {
    playerStatus.textContent = 'ELIMINATED';
    playerStatus.className = 'status-badge eliminated';
  } else {
    playerStatus.textContent = '';
    playerStatus.className = '';
  }

  const turnIndicator = document.getElementById('turn-indicator');
  clearElement(turnIndicator);
  if (state.currentPlayer === 0 && !humanPlayer.isEliminated && !state.gameover) {
    turnIndicator.className = 'turn-indicator your-turn';
    turnIndicator.textContent = `${humanPlayer.name.toUpperCase()}'S TURN! \u{1F3AE}`;
  } else {
    turnIndicator.className = 'turn-indicator waiting';
    turnIndicator.textContent = 'WAITING...';
  }

  const drawButton = document.getElementById('draw-button');
  drawButton.textContent = `DRAW CARD \u{1F0CF} (${state.deck.length} left)`;
  drawButton.className = 'draw-button';

  const hasPendingAction =
    (state.pendingViltrumiteAttack && state.pendingPlayer === 0) ||
    state.seeTheFutureCards !== null ||
    (state.favorTarget === 0 && state.pendingFavor !== null);

  const canDraw = state.currentPlayer === 0 &&
    !humanPlayer.isEliminated &&
    !state.gameover &&
    !hasPendingAction;

  drawButton.disabled = !canDraw;

  const newDrawButton = drawButton.cloneNode(true);
  drawButton.parentNode.replaceChild(newDrawButton, drawButton);
  if (canDraw) {
    newDrawButton.addEventListener('click', () => callbacks.onDrawCard());
  }

  renderPlayerHand(state, callbacks);
  renderFavorBanner(state);
  renderHelpText(state);
}

function renderPlayerHand(state, callbacks) {
  const handContainer = document.getElementById('player-hand');
  clearElement(handContainer);

  const humanPlayer = state.players[0];
  const grid = createElement('div', 'cards-grid');

  const isFavorMode = state.favorTarget === 0 && state.pendingFavor !== null;

  if (isFavorMode) {
    grid.classList.add('favor-mode');
  }

  const hasPendingAction =
    (state.pendingViltrumiteAttack && state.pendingPlayer === 0) ||
    state.seeTheFutureCards !== null ||
    (state.favorTarget === 0 && state.pendingFavor !== null);

  const isHumanTurn = state.currentPlayer === 0 &&
    !humanPlayer.isEliminated &&
    !state.gameover &&
    !hasPendingAction;

  const basicCounts = {};
  humanPlayer.hand.forEach(card => {
    if (card.type === 'basic') {
      basicCounts[card.name] = (basicCounts[card.name] || 0) + 1;
    }
  });

  humanPlayer.hand.forEach((card, cardIndex) => {
    const tile = createElement('div', 'card-tile');

    const emojiSpan = createElement('span', 'card-emoji', card.emoji);
    tile.appendChild(emojiSpan);

    const nameSpan = createElement('span', 'card-name', card.name);
    tile.appendChild(nameSpan);

    const typeSpan = createElement('span', 'card-type', card.description);
    tile.appendChild(typeSpan);

    let actionText = '';

    if (isFavorMode) {
      tile.classList.add('playable');
      actionText = 'Give card';
      tile.addEventListener('click', () => callbacks.onGiveFavorCard(cardIndex));

    } else if (isHumanTurn) {
      switch (card.type) {
        case 'viltrumite_attack':
          tile.classList.add('non-playable', 'viltrumite-attack');
          actionText = 'DANGER!';
          break;

        case 'hero_assist':
          tile.classList.add('non-playable', 'hero-assist');
          actionText = 'SAFETY';
          break;

        case 'skip':
          tile.classList.add('playable');
          actionText = 'Play';
          tile.addEventListener('click', () => callbacks.onPlayCard(cardIndex));
          break;

        case 'shuffle':
          tile.classList.add('playable');
          actionText = 'Play';
          tile.addEventListener('click', () => callbacks.onPlayCard(cardIndex));
          break;

        case 'attack':
          tile.classList.add('playable');
          actionText = 'Play';
          tile.addEventListener('click', () => callbacks.onPlayCard(cardIndex));
          break;

        case 'see_future':
          tile.classList.add('playable');
          actionText = 'See future';
          tile.addEventListener('click', () => callbacks.onPlayCard(cardIndex));
          break;

        case 'favor':
          tile.classList.add('playable');
          actionText = 'Choose target';
          tile.addEventListener('click', () => callbacks.onPlayCard(cardIndex));
          break;

        case 'basic':
          if (basicCounts[card.name] >= 2) {
            tile.classList.add('basic-pair', 'playable');
            actionText = 'Play pair';
            const pairLabel = createElement('span', 'card-action', 'PAIR!');
            tile.appendChild(pairLabel);
            tile.addEventListener('click', () => callbacks.onPlayCard(cardIndex));
          } else {
            tile.classList.add('non-playable');
            actionText = 'Need pair';
          }
          break;

        default:
          tile.classList.add('non-playable');
          actionText = '';
      }
    } else {
      tile.classList.add('non-playable');
    }

    const actionSpan = createElement('span', 'card-action', actionText);
    tile.appendChild(actionSpan);

    grid.appendChild(tile);
  });

  handContainer.appendChild(grid);
}

function renderFavorBanner(state) {
  const banner = document.getElementById('favor-banner');
  clearElement(banner);

  if (state.favorTarget === 0 && state.pendingFavor !== null) {
    banner.classList.remove('hidden');
    banner.className = 'favor-instruction';
    const requesterName = state.players[state.pendingFavor].name;
    banner.textContent = `\u{1F91D} GIVE A CARD - Click any card to give to ${requesterName}`;
  } else {
    banner.className = 'hidden';
  }
}

function renderHelpText(state) {
  const helpText = document.getElementById('help-text');

  const playerName = state.players[0].name;

  if (state.gameover) {
    helpText.textContent = 'Game over! Check the results above.';
  } else if (state.favorTarget === 0 && state.pendingFavor !== null) {
    const requesterName = state.players[state.pendingFavor].name;
    helpText.textContent = `${playerName} must give a card to ${requesterName}.`;
  } else if (state.pendingViltrumiteAttack && state.pendingPlayer === 0) {
    helpText.textContent = 'Choose where to place the Viltrumite Attack in the deck.';
  } else if (state.seeTheFutureCards) {
    helpText.textContent = 'Viewing the top 3 cards of the deck...';
  } else if (state.currentPlayer === 0) {
    helpText.textContent = 'Play cards or draw to end your turn.';
  } else if (state.players[0].isEliminated) {
    helpText.textContent = `${playerName} has been eliminated. Watch the rest of the game!`;
  } else {
    const cpuName = state.players[state.currentPlayer].name;
    helpText.textContent = `Waiting for ${cpuName}...`;
  }
}

function renderModals(state, callbacks) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  if (state.gameover) {
    overlay.classList.remove('hidden');
    overlay.className = 'modal-overlay';
    clearElement(content);
    content.className = 'modal-content game-over';

    const title = createElement('h2', '', '\u{1F389}\u{1F38A} Game Over! \u{1F38A}\u{1F389}');
    content.appendChild(title);

    const winner = createElement('p', 'modal-highlight', `\u{1F3C6} ${state.gameover.winnerName} wins!`);
    content.appendChild(winner);

    const reason = createElement('p', '', state.gameover.reason);
    content.appendChild(reason);

    const buttonRow = createElement('div', 'modal-buttons');
    const newGameBtn = createElement('button', 'modal-button primary', 'Start New Game');
    newGameBtn.addEventListener('click', () => callbacks.onNewGame());
    buttonRow.appendChild(newGameBtn);
    content.appendChild(buttonRow);
    return;
  }

  if (state.attackNotification) {
    overlay.classList.remove('hidden');
    overlay.className = 'modal-overlay';
    clearElement(content);
    content.className = 'modal-content attack';

    const emojiHeader = createElement('p', 'modal-emoji-header', '\u{2694}\u{FE0F}\u{1F4A5}');
    content.appendChild(emojiHeader);

    const title = createElement('h2', 'modal-text-center', "YOU'VE BEEN ATTACKED!");
    content.appendChild(title);

    const funnyMessages = [
      "Looks like someone doesn't like you very much!",
      "That's gonna leave a mark!",
      "Time to sweat! Good luck not exploding!",
      "The viltrumites are getting restless...",
      "Hope you have a good hand! (You'll need it)",
      "Plot twist: it's always your turn now!",
      "Somebody call the GDA!",
      "This is what happens when you trust a viltrumite..."
    ];
    const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    const messagePara = createElement('p', 'modal-text-center', randomMessage);
    content.appendChild(messagePara);

    const damage = createElement('p', 'modal-text-center modal-highlight', `Damage: Take ${state.attackNotification.remainingTurns} turns`);
    content.appendChild(damage);

    const buttonRow = createElement('div', 'modal-buttons modal-text-center');

    const acceptBtn = createElement('button', 'modal-button primary', "FINE, I'LL TAKE IT! \u{1F624}");
    acceptBtn.addEventListener('click', () => {
      state.attackNotification = null;
      callbacks.onDismissModal();
    });
    buttonRow.appendChild(acceptBtn);

    const unfairBtn = createElement('button', 'modal-button secondary', 'THIS IS UNFAIR! \u{1F63E}');
    unfairBtn.addEventListener('click', () => {
      state.attackNotification = null;
      callbacks.onDismissModal();
    });
    buttonRow.appendChild(unfairBtn);

    content.appendChild(buttonRow);
    return;
  }

  if (state.seeTheFutureCards) {
    overlay.classList.remove('hidden');
    overlay.className = 'modal-overlay';
    clearElement(content);
    content.className = 'modal-content';

    const title = createElement('h2', '', '\u{1F52E} See the Future');
    content.appendChild(title);

    const helper = createElement('p', '', 'The first card shown will be drawn next...');
    content.appendChild(helper);

    const cardList = createElement('div', 'modal-list');

    state.seeTheFutureCards.forEach((card, index) => {
      let itemClasses = 'modal-list-item';

      if (card.type === 'viltrumite_attack') {
        itemClasses += ' stf-viltrumite-attack';
      } else if (card.type === 'hero_assist') {
        itemClasses += ' stf-hero-assist';
      }

      const item = createElement('div', itemClasses);
      item.style.cursor = 'default';

      item.textContent = `${index + 1}. ${card.emoji} ${card.name} - ${card.description}`;
      cardList.appendChild(item);
    });

    content.appendChild(cardList);

    const buttonRow = createElement('div', 'modal-buttons');
    const gotItBtn = createElement('button', 'modal-button primary', 'Got it! \u{1F44D}');
    gotItBtn.addEventListener('click', () => {
      state.seeTheFutureCards = null;
      state.seeTheFuturePlayer = null;
      callbacks.onDismissModal();
    });
    buttonRow.appendChild(gotItBtn);
    content.appendChild(buttonRow);
    return;
  }

  overlay.className = 'modal-overlay hidden';
}

function showTargetSelectionModal(state, title, emoji, onSelect, onCancel) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  overlay.classList.remove('hidden');
  overlay.className = 'modal-overlay';
  clearElement(content);
  content.className = 'modal-content';

  const heading = createElement('h2', '', `${emoji} ${title}`);
  content.appendChild(heading);

  const helper = createElement('p', '', 'Choose a player to target:');
  content.appendChild(helper);

  const playerList = createElement('div', 'modal-list');

  for (let i = 1; i <= 3; i++) {
    const player = state.players[i];

    if (player.isEliminated || player.hand.length === 0) {
      continue;
    }

    const item = createElement('div', 'modal-list-item');
    item.textContent = `\u{1F916} ${player.name} (${player.hand.length} cards)`;
    item.addEventListener('click', () => onSelect(player.id));
    playerList.appendChild(item);
  }

  content.appendChild(playerList);

  const buttonRow = createElement('div', 'modal-buttons');
  const cancelBtn = createElement('button', 'modal-button secondary', 'Cancel');
  cancelBtn.addEventListener('click', () => onCancel());
  buttonRow.appendChild(cancelBtn);
  content.appendChild(buttonRow);
}

function showBasicPairStealModal(state, targetId, onSelect, onCancel) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const target = state.players[targetId];

  overlay.classList.remove('hidden');
  overlay.className = 'modal-overlay';
  clearElement(content);
  content.className = 'modal-content';

  const heading = createElement('h2', '', `Steal from ${target.name}!`);
  content.appendChild(heading);

  const helper = createElement('p', '', 'Pick a card (face down - it\'s a lucky dip!):');
  content.appendChild(helper);

  const cardGrid = createElement('div', 'cards-grid modal-card-grid');

  for (let i = 0; i < target.hand.length; i++) {
    const cardBack = createElement('div', 'card-tile playable');

    const backEmoji = createElement('span', 'card-emoji', '\u{1F0A0}');
    cardBack.appendChild(backEmoji);

    const backLabel = createElement('span', 'card-name', `Card ${i + 1}`);
    cardBack.appendChild(backLabel);

    cardBack.addEventListener('click', () => onSelect(i));
    cardGrid.appendChild(cardBack);
  }

  content.appendChild(cardGrid);

  const buttonRow = createElement('div', 'modal-buttons');

  const backBtn = createElement('button', 'modal-button secondary', 'Back');
  backBtn.addEventListener('click', () => onCancel());
  buttonRow.appendChild(backBtn);

  const cancelBtn = createElement('button', 'modal-button secondary', 'Cancel');
  cancelBtn.addEventListener('click', () => onCancel());
  buttonRow.appendChild(cancelBtn);

  content.appendChild(buttonRow);
}

export {
  renderGame,
  showTargetSelectionModal,
  showBasicPairStealModal
};
