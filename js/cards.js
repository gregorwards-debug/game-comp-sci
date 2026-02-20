const CARD_TYPES = {
  viltrumite_attack: { name: 'Viltrumite Attack',  emoji: '💥👊', description: 'Explode unless you have a Hero Assist card', count: 3  },
  hero_assist:       { name: 'Hero Assist',        emoji: '🛡️',  description: 'Counter a Viltrumite Attack',                count: 6  },
  skip:              { name: 'Skip',               emoji: '⏭️',  description: 'End your turn without drawing',              count: 4  },
  favor:             { name: 'Favor',              emoji: '🤝',  description: 'Force a player to give you a card',          count: 4  },
  shuffle:           { name: 'Shuffle',            emoji: '🔀',  description: 'Shuffle the draw pile',                      count: 4  },
  attack:            { name: 'Attack',             emoji: '⚔️',  description: 'End turn, next player takes 2 turns',        count: 4  },
  see_future:        { name: 'See the Future',     emoji: '🔮',  description: 'Peek at top 3 cards of the deck',            count: 5  },
  basic:             { name: 'Basic Card',         emoji: '🃏',  description: 'Collect pairs to steal cards',               count: 20 }
};

const BASIC_TYPES = [
  { name: 'Viltrum Relic',     emoji: '🏛️' },
  { name: 'Sequid',            emoji: '🦑' },
  { name: 'Battle Beast',      emoji: '🦁' },
  { name: 'Space Racer',       emoji: '🚀' },
  { name: 'Guardians Badge',   emoji: '⭐' }
];

function createCard(type, basicName = null) {
  const id = `card-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const base = CARD_TYPES[type];

  if (type === 'basic' && basicName) {
    const basicType = BASIC_TYPES.find(c => c.name === basicName);
    return {
      id,
      type,
      name: basicType.name,
      emoji: basicType.emoji,
      description: base.description
    };
  }

  return {
    id,
    type,
    name: base.name,
    emoji: base.emoji,
    description: base.description
  };
}

function createDeck() {
  const deck = [];

  for (const [type, info] of Object.entries(CARD_TYPES)) {
    if (type === 'basic') {
      for (const basicType of BASIC_TYPES) {
        for (let i = 0; i < 4; i++) {
          deck.push(createCard('basic', basicType.name));
        }
      }
    } else {
      for (let i = 0; i < info.count; i++) {
        deck.push(createCard(type));
      }
    }
  }

  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export { CARD_TYPES, BASIC_TYPES, createCard, createDeck, shuffleDeck };
