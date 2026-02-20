import {
  createGameState,
  drawCard,
  playSkip,
  playAttack,
  playFavor,
  resolveFavor,
  playShuffle,
  playSeeTheFuture,
  playBasicPair,
  playSingleBasic,
  placeViltrumiteAttack,
  getValidTargets
} from './game.js';

import { executeCPUTurn } from './cpu.js';

import { renderGame, showTargetSelectionModal, showBasicPairStealModal } from './ui.js';

class Game {

  state            = "MAIN_MENU";
  players          = [];
  currentPlayerIndex = 0;
  deck             = [];
  discardPile      = [];
  attackActive     = false;
  attackTimer      = 0;

  constructor() {
    this.state         = "MAIN_MENU";
    this.discardPile   = [];
    this.attackActive  = false;
    this.attackTimer   = 0;
    this._gameData     = {};
  }

  changeState(newState) {
    this.state = newState;
    this.update();
  }

  update() {
    if (this.state === "MAIN_MENU") {
      this.mainMenuUpdate();
    } else if (this.state === "CHARACTER_SELECT") {
      this.characterSelectUpdate();
    } else if (this.state === "GAMEPLAY") {
      this.gameplayUpdate();
    } else if (this.state === "PAUSED") {
      this.pauseMenuUpdate();
    } else if (this.state === "GAME_OVER") {
      this.gameOverUpdate();
    } else if (this.state === "WIN") {
      this.winUpdate();
    }
  }

  mainMenuUpdate() {
    const startScreen = document.getElementById('start-screen');
    const charScreen  = document.getElementById('character-select-screen');
    const gameScreen  = document.getElementById('game-screen');

    gameScreen.classList.add('hidden');
    charScreen.classList.add('hidden');
    charScreen.classList.remove('fade-out');
    startScreen.classList.remove('hidden', 'fade-out');

    this.selectedCharacter = null;
  }

  characterSelectUpdate() {
    const startScreen = document.getElementById('start-screen');
    const charScreen  = document.getElementById('character-select-screen');

    startScreen.classList.add('fade-out');
    startScreen.addEventListener('transitionend', () => {
      startScreen.classList.add('hidden');
      charScreen.classList.remove('hidden', 'fade-out');
    }, { once: true });

    this.selectedCharacter = null;
    const startBtn = document.getElementById('char-start');
    startBtn.disabled = true;
    const highlight = document.getElementById('char-highlight');
    highlight.classList.add('hidden');
  }

  gameplayUpdate() {
    const charScreen  = document.getElementById('character-select-screen');
    const gameScreen  = document.getElementById('game-screen');

    const freshState = createGameState(this.selectedCharacter);

    this._gameData     = freshState;
    this.players       = freshState.players;
    this.deck          = freshState.deck;
    this.discardPile   = freshState.discardPile;
    this.currentPlayerIndex = freshState.currentPlayer;
    this.attackActive  = freshState.attackActive ?? false;
    this.attackTimer   = freshState.attackTimer  ?? 0;

    charScreen.classList.add('fade-out');
    charScreen.addEventListener('transitionend', () => {
      charScreen.classList.add('hidden');
      gameScreen.classList.remove('hidden');
    }, { once: true });

    this.render();
  }

  pauseMenuUpdate() {
    alert('Game paused – resume coming soon!');
  }

  gameOverUpdate() {
    this.changeState("MAIN_MENU");
  }

  winUpdate() {
    this.changeState("MAIN_MENU");
  }

  render() {
    renderGame(this._gameData, callbacks);
  }

  checkAndRunCPUTurns() {
    if (this._gameData.currentPlayer !== 0 && !this._gameData.gameover) {
      this.runCPUTurns();
    }
  }

  async runCPUTurns() {
    while (this._gameData.currentPlayer !== 0 && !this._gameData.gameover) {
      const currentCPU = this._gameData.currentPlayer;
      await executeCPUTurn(this._gameData, currentCPU, () => this.render());
      this.render();
    }
  }
}

const game = new Game();

const callbacks = {

  onPlayCard(cardIndex) {
    const state = game._gameData;
    const card = state.players[0].hand[cardIndex];
    if (!card) return;

    switch (card.type) {

      case 'skip':
        playSkip(state, 0, cardIndex);
        game.render();
        game.checkAndRunCPUTurns();
        break;

      case 'attack':
        playAttack(state, 0, cardIndex);
        game.render();
        game.checkAndRunCPUTurns();
        break;

      case 'shuffle':
        playShuffle(state, 0, cardIndex);
        game.render();
        break;

      case 'see_future':
        playSeeTheFuture(state, 0, cardIndex);
        game.render();
        break;

      case 'favor':
        showTargetSelectionModal(
          state,
          'Favor',
          '\u{1F91D}',
          (targetId) => {
            const newCardIndex = state.players[0].hand.findIndex(c => c.id === card.id);
            if (newCardIndex === -1) return;
            playFavor(state, 0, newCardIndex, targetId);
            game.render();
          },
          () => { game.render(); }
        );
        break;

      case 'basic': {
        const matchingBasics = state.players[0].hand.filter(
          c => c.type === 'basic' && c.name === card.name
        );

        if (matchingBasics.length >= 2) {
          const validTargets = getValidTargets(state, 0);
          if (validTargets.length === 0) { game.render(); return; }

          showTargetSelectionModal(
            state,
            `Play ${card.name} Pair`,
            card.emoji,
            (targetId) => {
              showBasicPairStealModal(
                state,
                targetId,
                () => { playBasicPair(state, 0, card.name, targetId); game.render(); },
                () => { game.render(); }
              );
            },
            () => { game.render(); }
          );
        } else {
          playSingleBasic(state, 0, cardIndex);
          game.render();
        }
        break;
      }
    }
  },

  onDrawCard() {
    const state = game._gameData;
    const result = drawCard(state, 0);
    game.render();

    if (result.result === 'drawn' && !result.continueTurn) {
      game.checkAndRunCPUTurns();
    } else if (result.result === 'exploded') {
      game.checkAndRunCPUTurns();
    }
  },

  onPlaceViltrumiteAttack(position) {
    const state = game._gameData;
    const result = placeViltrumiteAttack(state, position);
    game.render();

    if (!result.continueTurn) {
      game.checkAndRunCPUTurns();
    }
  },

  onSelectTarget(targetId) {
  },

  onGiveFavorCard(cardIndex) {
    const state = game._gameData;
    resolveFavor(state, cardIndex);
    game.render();
  },

  onDismissModal() {
    const state = game._gameData;
    game.render();
    if (state.currentPlayer !== 0) {
      game.checkAndRunCPUTurns();
    }
  },

  onNewGame() {
    game.changeState("MAIN_MENU");
  },

  onCancelTargetSelection() {
    game.render();
  }
};

document.getElementById('play-btn').addEventListener('click', () => {
  game.changeState("CHARACTER_SELECT");
});

const CHARACTER_NAMES = ['Invincible', 'Atom Eve', 'Robot', 'Omni-Man'];

const CHAR_POSITIONS = {
  'Invincible': { left: '2%',  top: '12%', width: '23%', height: '70%' },
  'Atom Eve':   { left: '26%', top: '12%', width: '23%', height: '70%' },
  'Robot':      { left: '50%', top: '12%', width: '23%', height: '70%' },
  'Omni-Man':   { left: '74%', top: '12%', width: '23%', height: '70%' },
};

document.querySelectorAll('.char-btn[data-character]').forEach(btn => {
  btn.addEventListener('click', () => {
    const charName = btn.dataset.character;
    game.selectedCharacter = charName;

    const highlight = document.getElementById('char-highlight');
    const pos = CHAR_POSITIONS[charName];
    highlight.style.left   = pos.left;
    highlight.style.top    = pos.top;
    highlight.style.width  = pos.width;
    highlight.style.height = pos.height;
    highlight.classList.remove('hidden');

    document.getElementById('char-start').disabled = false;
  });
});

document.getElementById('char-back').addEventListener('click', () => {
  game.changeState("MAIN_MENU");
});

document.getElementById('char-start').addEventListener('click', () => {
  if (game.selectedCharacter) {
    game.changeState("GAMEPLAY");
  }
});
