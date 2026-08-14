export const tokenize = (text = '') => [...new Set(text.toLowerCase().match(/[a-z0-9+#.]+/g) || [])];

export const overlapScore = (left = '', right = '') => {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
  return Math.round((overlap / Math.max(rightTokens.length, 1)) * 100);
};

export const cosineSimilarity = (left = [], right = []) => {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;
  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMag += left[index] ** 2;
    rightMag += right[index] ** 2;
  }
  return Number((dot / ((Math.sqrt(leftMag) * Math.sqrt(rightMag)) || 1)).toFixed(6));
};
