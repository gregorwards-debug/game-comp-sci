import {
  drawCard, playSkip, playAttack, playFavor, playShuffle,
  playSeeTheFuture, playBasicPair, playSingleBasic, placeViltrumiteAttack,
  getValidTargets
} from './game.js';

const BOT_CONFIGS = {
  1: { name: 'CPU 1', title: 'ThinkingBot', minDelay: 500, maxDelay: 2000 },
  2: { name: 'CPU 2', title: 'FastThinkingBot', minDelay: 200, maxDelay: 800 },
  3: { name: 'CPU 3', title: 'SlowThinkingBot', minDelay: 1000, maxDelay: 3000 }
};

function getThinkingDelay(playerIndex) {
  const config = BOT_CONFIGS[playerIndex];
  return config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getLegalMoves(state, playerIndex) {
  if (state.waitingForFavor === playerIndex) {
    return [{ type: 'waitForFavor' }];
  }

  if (state.pendingViltrumiteAttack && state.pendingPlayer === playerIndex) {
    return [
      { type: 'placeViltrumiteAttack', position: 0 },
      { type: 'placeViltrumiteAttack', position: Math.floor(state.deck.length / 3) },
      { type: 'placeViltrumiteAttack', position: Math.floor(state.deck.length * 2 / 3) },
      { type: 'placeViltrumiteAttack', position: state.deck.length }
    ];
  }

  const moves = [];
  const validTargets = getValidTargets(state, playerIndex);
  const player = state.players[playerIndex];

  for (let i = 0; i < player.hand.length; i++) {
    const card = player.hand[i];

    switch (card.type) {
      case 'skip':
      case 'shuffle':
      case 'attack':
      case 'see_future':
        moves.push({ type: 'playCard', cardType: card.type, cardIndex: i });
        break;

      case 'favor':
        for (const targetId of validTargets) {
          moves.push({ type: 'playFavor', cardIndex: i, targetIndex: targetId });
        }
        break;

      case 'basic':
        const matchCount = player.hand.filter(c => c.type === 'basic' && c.name === card.name).length;
        if (matchCount >= 2) {
          for (const targetId of validTargets) {
            const alreadyAdded = moves.some(
              m => m.type === 'playBasicPair' && m.cardName === card.name && m.targetIndex === targetId
            );
            if (!alreadyAdded) {
              moves.push({ type: 'playBasicPair', cardName: card.name, targetIndex: targetId });
            }
          }
        }
        break;
    }
  }

  if (state.deck.length > 0) {
    moves.push({ type: 'drawCard' });
  }

  return moves;
}

function executeMove(state, playerIndex, move) {
  switch (move.type) {
    case 'drawCard':
      return { ...drawCard(state, playerIndex), action: 'draw' };

    case 'playCard':
      switch (move.cardType) {
        case 'skip':
          return { ...playSkip(state, playerIndex, move.cardIndex), action: 'skip' };
        case 'attack':
          return { ...playAttack(state, playerIndex, move.cardIndex), action: 'attack' };
        case 'shuffle':
          return { ...playShuffle(state, playerIndex, move.cardIndex), action: 'shuffle' };
        case 'see_future':
          return { ...playSeeTheFuture(state, playerIndex, move.cardIndex), action: 'see_future' };
      }
      break;

    case 'playFavor':
      return { ...playFavor(state, playerIndex, move.cardIndex, move.targetIndex), action: 'favor' };

    case 'playBasicPair':
      return { ...playBasicPair(state, playerIndex, move.cardName, move.targetIndex), action: 'basicPair' };

    case 'placeViltrumiteAttack':
      return { ...placeViltrumiteAttack(state, move.position), action: 'placeViltrumiteAttack' };

    case 'waitForFavor':
      return { action: 'waitForFavor', waiting: true };
  }
}

async function executeCPUTurn(state, playerIndex, onStateChange) {
  while (state.currentPlayer === playerIndex && !state.gameover) {
    await wait(getThinkingDelay(playerIndex));

    const moves = getLegalMoves(state, playerIndex);

    if (moves.length === 0) break;

    const move = moves[Math.floor(Math.random() * moves.length)];

    if (move.type === 'waitForFavor') {
      await wait(500);
      onStateChange(state);
      continue;
    }

    const result = executeMove(state, playerIndex, move);

    onStateChange(state);

    if (result.action === 'draw') break;
    if (result.action === 'attack') break;
    if (result.action === 'skip' && result.turnEnded) break;

    if (result.action === 'placeViltrumiteAttack') {
      if (!result.continueTurn) break;
    }
  }
}

export { BOT_CONFIGS, getLegalMoves, executeCPUTurn };
