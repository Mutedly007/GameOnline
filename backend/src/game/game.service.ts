import { Injectable } from '@nestjs/common';
import { AVAILABLE_LETTERS, CategoryKey, Answer } from './game.types';

@Injectable()
export class GameService {
  private usedLetters: Map<string, string[]> = new Map(); // roomCode -> used letters

  generateLetter(roomCode: string): string {
    if (!this.usedLetters.has(roomCode)) {
      this.usedLetters.set(roomCode, []);
    }
    const used = this.usedLetters.get(roomCode)!;
    const available = AVAILABLE_LETTERS.filter((l) => !used.includes(l));

    if (available.length === 0) {
      // Reset if all letters used
      this.usedLetters.set(roomCode, []);
      return AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)];
    }

    const letter = available[Math.floor(Math.random() * available.length)];
    used.push(letter);
    return letter;
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
    const categories: CategoryKey[] = ['girl', 'boy', 'animal', 'plant', 'object', 'country', 'job'];

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
    this.usedLetters.delete(roomCode);
  }
}
