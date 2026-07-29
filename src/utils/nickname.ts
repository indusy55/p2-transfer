const ADJECTIVES = [
  '勇敢的', '安静的', '快乐的', '聪明的', '温柔的',
  '神秘的', '闪亮的', '迅捷的', '优雅的', '活泼的',
  '沉稳的', '灵巧的', '自由的', '明亮的', '柔和的',
  '坚定的', '敏锐的', '淡然的', '热情的', '清新的'
];

const NOUNS = [
  '海豚', '星辰', '白鹭', '云雀', '银狐',
  '雪豹', '飞鱼', '萤火', '青鸟', '玄猫',
  '鹿角', '蜻蜓', '松鼠', '水獭', '翠鸟',
  '彩虹', '极光', '流萤', '晚风', '朝露'
];

const NICKNAME_KEY = 'p2-transfer:nickname';

export function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return adj + noun;
}

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) || generateNickname();
  } catch {
    return generateNickname();
  }
}

export function saveNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // Ignore storage errors
  }
}
