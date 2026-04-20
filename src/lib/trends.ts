export function detectConsecutiveDeclines(scores: number[]): { maxConsecutive: number } {
  let consecutive = 0;
  let maxConsecutive = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] < scores[i - 1]) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  return { maxConsecutive };
}
