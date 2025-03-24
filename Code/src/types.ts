// src/types.ts
export interface RecognizedEntities {
  famous_person?: string;
}
// Definição do contexto do chatbot
export interface ChatbotContext {
    score: number;
    spstRef: any;
    lastResult: string;
    currentPerson: string | undefined;
    currentPersonIndex: number;
    currentHintIndex: 0;
    rightAnswer: string | undefined;
  }
  
  // Definição dos eventos possíveis
  export type ChatbotEvent =
    | { type: 'START'; name: string }
    | { type: 'ASK_QUESTION' }
    | { type: 'ANSWER'; correct: any }
    | { type: 'END' }
    | { type: 'STOP' }
    | { type: 'CONTINUE' }
    | { type: "CLICK" }
    | { type: "ASR_NOINPUT" }
    | { type: "SPEAK_COMPLETE" }
    | { type: "LISTEN_COMPLETE" }
    | { type: "RECOGNISED"; data: { nluValue: { intent: string; entities: RecognizedEntities } }; value: any; }
    | { type: "ASRTTS_READY" };
  