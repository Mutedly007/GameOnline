import { Injectable } from '@nestjs/common';
import { AVAILABLE_LETTERS, CategoryKey, Answer } from './game.types';

@Injectable()
export class GameService {
  // Pre-shuffled queue of letters per room — ensures every letter is used before repeating
  private letterQueues: Map<string, string[]> = new Map();
  private usedLettersInGame: Map<string, string[]> = new Map(); // track used for display

  /**
   * Fisher-Yates shuffle for truly random ordering
   */
  private shuffle(arr: string[]): string[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private getOrCreateQueue(roomCode: string): string[] {
    let queue = this.letterQueues.get(roomCode);
    if (!queue || queue.length === 0) {
      queue = this.shuffle([...AVAILABLE_LETTERS]);
      this.letterQueues.set(roomCode, queue);
    }
    return queue;
  }

  generateLetter(roomCode: string): string {
    const queue = this.getOrCreateQueue(roomCode);
    const letter = queue.shift()!;
    this.letterQueues.set(roomCode, queue);

    // Track used letters for this game session
    if (!this.usedLettersInGame.has(roomCode)) {
      this.usedLettersInGame.set(roomCode, []);
    }
    this.usedLettersInGame.get(roomCode)!.push(letter);

    return letter;
  }

  /**
   * Skip the current letter and generate a new one.
   * Puts the skipped letter back into a random position in the queue.
   */
  skipAndGenerateNewLetter(roomCode: string, currentLetter: string): string {
    // Remove from used list
    const used = this.usedLettersInGame.get(roomCode);
    if (used) {
      const idx = used.lastIndexOf(currentLetter);
      if (idx >= 0) used.splice(idx, 1);
    }

    // Put skipped letter back into queue at a random position
    const queue = this.getOrCreateQueue(roomCode);
    const insertPos = Math.floor(Math.random() * (queue.length + 1));
    queue.splice(insertPos, 0, currentLetter);

    // Now pick the next one
    return this.generateLetter(roomCode);
  }

  getUsedLetters(roomCode: string): string[] {
    return this.usedLettersInGame.get(roomCode) || [];
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  validateAnswer(answer: string, letter: string): boolean {
    if (!answer || answer.trim().length === 0) return false;
    return answer.trim().toUpperCase().startsWith(letter.toUpperCase());
  }

  calculateScores(
    answers: Answer[],
    votes: { playerId: string; category: string; votedInvalid: string[] }[],
    letter: string,
    hostId: string,
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    const categories: CategoryKey[] = ['girl', 'boy', 'animal', 'plant', 'object', 'country', 'job', 'famous'];

    // Initialize scores
    for (const answer of answers) {
      scores[answer.playerId] = 0;
    }

    for (const category of categories) {
      // Collect all answers for this category
      const categoryAnswers: { playerId: string; value: string }[] = [];
      for (const answer of answers) {
        const value = answer.categories[category]?.trim().toLowerCase() || '';
        categoryAnswers.push({ playerId: answer.playerId, value });
      }

      for (const { playerId, value } of categoryAnswers) {
        // Check if host rejected this answer
        const voteEntry = votes.find(
          (v) => v.playerId === playerId && v.category === category,
        );
        const hostRejected = voteEntry ? voteEntry.votedInvalid.includes(hostId) : false;

        if (hostRejected) {
          scores[playerId] += 0;
          continue;
        }

        // Validate answer starts with correct letter
        if (!this.validateAnswer(value, letter)) {
          scores[playerId] += 0;
          continue;
        }

        // Check for duplicates
        const duplicateCount = categoryAnswers.filter(
          (a) => a.value === value && a.value !== '',
        ).length;

        if (duplicateCount > 1) {
          scores[playerId] += 0; // Duplicate
        } else {
          scores[playerId] += 10; // Unique valid answer
        }
      }
    }

    return scores;
  }

  clearRoom(roomCode: string): void {
    this.letterQueues.delete(roomCode);
    this.usedLettersInGame.delete(roomCode);
  }
}
