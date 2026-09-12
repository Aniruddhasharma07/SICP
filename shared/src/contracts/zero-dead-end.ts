/**
 * Zero-Dead-End Contract.
 * Every workflow screen and error state must explicitly answer these 6 questions.
 */
export interface ZeroDeadEndState {
  whatHappened: string;
  currentStatus: string;
  whyStatus: string;
  whatCanDoNext: string[];
  whoIsResponsible: string;
  whatHappensIfIdle: string;
}
