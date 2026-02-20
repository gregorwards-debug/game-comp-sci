import { CARD_TYPES, BASIC_TYPES, createCard, createDeck, shuffleDeck } from './cards.js';

function createGameState(selectedCharacter = null) {
  const allCards = createDeck();

  const viltrumiteAttackCards = allCards.filter(card => card.type === 'viltrumite_attack');
  const heroAssistCards = allCards.filter(card => card.type === 'hero_assist');
  const actionCards = allCards.filter(card => card.type !== 'viltrumite_attack' && card.type !== 'hero_assist');

  shuffleDeck(actionCards);

  const allCharacters = ['Invincible', 'Atom Eve', 'Robot', 'Omni-Man'];
  const humanName = selectedCharacter || 'You';
  const cpuNames = allCharacters.filter(name => name !== selectedCharacter);

  for (let i = cpuNames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cpuNames[i], cpuNames[j]] = [cpuNames[j], cpuNames[i]];
  }

  const players = {};
  const playerNames = [humanName, ...cpuNames];

  for (let i = 0; i < 4; i++) {
    const hand = [heroAssistCards[i]];
    hand.push(...actionCards.splice(0, 7));

    players[i] = {
      id: i,
      name: playerNames[i],
      hand: hand,
      isEliminated: false,
      isCPU: i !== 0
    };
  }

  const deck = [
    ...heroAssistCards.slice(4),
    ...viltrumiteAttackCards,
    ...actionCards
  ];

  shuffleDeck(deck);

  return {
    players,
    deck,
    discardPile: [],
    currentPlayer: 0,
    turnNumber: 1,
    turnsRemaining: { 0: 1, 1: 1, 2: 1, 3: 1 },
    pendingViltrumiteAttack: null,
    pendingPlayer: null,
    pendingFavor: null,
    favorTarget: null,
    waitingForFavor: null,
    seeTheFutureCards: null,
    seeTheFuturePlayer: null,
    attackNotification: null,
    gameover: null
  };
}

function getNextAlivePlayer(state, fromPlayer) {
  let next = fromPlayer;

  for (let i = 0; i < 4; i++) {
    next = (next + 1) % 4;

    if (!state.players[next].isEliminated) {
      return next;
    }
  }

  return fromPlayer;
}

function checkGameOver(state) {
  const alivePlayers = Object.values(state.players).filter(p => !p.isEliminated);

  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0];
    state.gameover = {
      winner: winner.id,
      winnerName: winner.name,
      reason: `${winner.name} is the last player standing!`
    };
    return true;
  }

  return false;
}

function endTurn(state) {
  state.turnNumber++;
  state.currentPlayer = getNextAlivePlayer(state, state.currentPlayer);
  return state;
}

function drawCard(state, playerIndex) {
  const player = state.players[playerIndex];
  const card = state.deck.pop();

  if (card.type === 'viltrumite_attack') {
    const heroAssistIndex = player.hand.findIndex(c => c.type === 'hero_assist');

    if (heroAssistIndex !== -1) {
      const heroAssistCard = player.hand.splice(heroAssistIndex, 1)[0];
      state.discardPile.push(heroAssistCard);

      state.pendingViltrumiteAttack = card;
      state.pendingPlayer = playerIndex;

      return { result: 'defused' };
    } else {
      player.isEliminated = true;
      state.discardPile.push(card);

      checkGameOver(state);

      state.turnsRemaining[playerIndex] = 1;
      endTurn(state);

      return { result: 'exploded' };
    }
  }

  player.hand.push(card);

  if (state.turnsRemaining[playerIndex] > 1) {
    state.turnsRemaining[playerIndex]--;
    return { result: 'drawn', card, continueTurn: true };
  } else {
    state.turnsRemaining[playerIndex] = 1;
    endTurn(state);
    return { result: 'drawn', card, continueTurn: false };
  }
}

function placeViltrumiteAttack(state, position) {
  const card = state.pendingViltrumiteAttack;
  const playerIndex = state.pendingPlayer;

  const actualIndex = state.deck.length - position;
  state.deck.splice(actualIndex, 0, card);

  state.pendingViltrumiteAttack = null;
  state.pendingPlayer = null;

  if (state.turnsRemaining[playerIndex] > 1) {
    state.turnsRemaining[playerIndex]--;
    return { continueTurn: true };
  } else {
    state.turnsRemaining[playerIndex] = 1;
    endTurn(state);
    return { continueTurn: false };
  }
}

function playSkip(state, playerIndex, cardIndex) {
  const player = state.players[playerIndex];
  const card = player.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);

  if (state.turnsRemaining[playerIndex] > 1) {
    state.turnsRemaining[playerIndex]--;
    return { turnEnded: false, skipDraw: true };
  } else {
    state.turnsRemaining[playerIndex] = 1;
    endTurn(state);
    return { turnEnded: true };
  }
}

function playAttack(state, playerIndex, cardIndex) {
  const player = state.players[playerIndex];
  const card = player.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);

  const targetPlayer = getNextAlivePlayer(state, playerIndex);
  state.turnsRemaining[targetPlayer] += 1;

  if (targetPlayer === 0) {
    state.attackNotification = {
      attackerName: player.name,
      targetPlayer: targetPlayer,
      remainingTurns: state.turnsRemaining[targetPlayer],
      timestamp: Date.now()
    };
  }

  endTurn(state);

  return { targetPlayer, turnEnded: true };
}

function playFavor(state, playerIndex, cardIndex, targetIndex) {
  const player = state.players[playerIndex];
  const target = state.players[targetIndex];

  if (target.isEliminated || targetIndex === playerIndex || target.hand.length === 0) {
    return { resolved: false, invalid: true };
  }

  const card = player.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);

  if (target.isCPU) {
    const randomIndex = Math.floor(Math.random() * target.hand.length);
    const givenCard = target.hand.splice(randomIndex, 1)[0];
    player.hand.push(givenCard);
    return { resolved: true, card: givenCard };
  } else {
    state.pendingFavor = playerIndex;
    state.favorTarget = 0;
    state.waitingForFavor = playerIndex;
    return { resolved: false, waitingForHuman: true };
  }
}

function resolveFavor(state, cardIndex) {
  const humanPlayer = state.players[state.favorTarget];
  const requester = state.players[state.pendingFavor];

  const card = humanPlayer.hand.splice(cardIndex, 1)[0];
  requester.hand.push(card);

  state.pendingFavor = null;
  state.favorTarget = null;
  state.waitingForFavor = null;

  return card;
}

function playShuffle(state, playerIndex, cardIndex) {
  const player = state.players[playerIndex];
  const card = player.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);

  shuffleDeck(state.deck);
}

function playSeeTheFuture(state, playerIndex, cardIndex) {
  const player = state.players[playerIndex];
  const card = player.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);

  if (playerIndex === 0) {
    state.seeTheFutureCards = state.deck.slice(-3).reverse();
    state.seeTheFuturePlayer = playerIndex;
  }
}

function playBasicPair(state, playerIndex, cardName, targetIndex) {
  const player = state.players[playerIndex];
  const target = state.players[targetIndex];

  const firstIndex = player.hand.findIndex(c => c.name === cardName);
  const firstCard = player.hand.splice(firstIndex, 1)[0];
  state.discardPile.push(firstCard);

  const secondIndex = player.hand.findIndex(c => c.name === cardName);
  const secondCard = player.hand.splice(secondIndex, 1)[0];
  state.discardPile.push(secondCard);

  const randomIndex = Math.floor(Math.random() * target.hand.length);
  const stolenCard = target.hand.splice(randomIndex, 1)[0];
  player.hand.push(stolenCard);

  return { stolenCard };
}

function playSingleBasic(state, playerIndex, cardIndex) {
  const player = state.players[playerIndex];
  const card = player.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);
}

function getValidTargets(state, playerIndex) {
  return Object.values(state.players)
    .filter(p => !p.isEliminated && p.id !== playerIndex && p.hand.length > 0)
    .map(p => p.id);
}

export {
  createGameState,
  getNextAlivePlayer,
  checkGameOver,
  endTurn,
  drawCard,
  placeViltrumiteAttack,
  playSkip,
  playAttack,
  playFavor,
  resolveFavor,
  playShuffle,
  playSeeTheFuture,
  playBasicPair,
  playSingleBasic,
  getValidTargets
};
