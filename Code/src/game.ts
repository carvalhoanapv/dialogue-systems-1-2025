import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { ChatbotContext, ChatbotEvent, RecognizedEntities } from "./types";
import { FamousPeople } from "./famous";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};

// Function to extract NLU intent and entities using object mapping
function findNLUIntent(event: any): { intent?: string; entities?: RecognizedEntities } {
  console.log("FULL EVENT OBJECT:", event); // Log the entire event for debugging

  if (!event?.nluValue) {
    console.log("No NLU data found in event.");
    return { intent: undefined, entities: {} };
  }

  const intent = event.nluValue.topIntent || undefined; // Extract intent
  const rawEntities = event.nluValue.entities || []; // Ensure entities are extracted correctly

  console.log("Recognized intent:", intent || "No intent detected");
  console.log("Extracted raw entities:", rawEntities);

  // Use object mapping to extract entities dynamically
  const entityMap: { [key: string]: keyof RecognizedEntities } = {
    "famous_person": "famous_person"
  };

  const extractedEntities: RecognizedEntities = {
    famous_person: undefined
  };

  rawEntities.forEach((entity: any) => {
    if (entity.category in entityMap) {
      extractedEntities[entityMap[entity.category]] = entity.text;
    }
  });

  console.log("Processed entities:", extractedEntities);
  return { intent, entities: extractedEntities };
}

interface GrammarEntry {
  playGame?: string;
  confirmation?: boolean;
}

const grammar: { [index: string]: GrammarEntry } = {
  yes: {confirmation: true},
  sure: {confirmation: true},
  okay: {confirmation: true},
  absolutely: {confirmation: true},

  no: {confirmation: false},
  "not really": {confirmation: false},
  nope: {confirmation: false},
};

function parseUtterance(utterance: string): GrammarEntry | null {
  return grammar[utterance.toLowerCase()] || null;
}

const getRandomPerson = () => FamousPeople[Math.floor(Math.random() * FamousPeople.length)];

export const machine = setup({
  types: {
    context: {} as ChatbotContext,
    events: {} as ChatbotEvent,
  },
  actions: {
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: { utterance: params.utterance },
      }),
    "spst.listen": ({ context }) =>
      context.spstRef.send({
        type: "LISTEN",
        value: { nlu: true },
      }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    score: 0,
  }),
  id: "guessHistoricalFigures",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { 
        CLICK: "askingQuestion", // Only start when clicking the button
        ASRTTS_READY: "askingQuestion" // Transition when ready
      },
    },
    askingQuestion: {
      initial: "Ask",
      entry: assign({
        currentPerson: () => getRandomPerson(),
        currentHintIndex: () => 0
    }),
      on: {
        ANSWER: [
          {
            target: "congratulating",
            actions: ({ context, event }) => {
              if (event.correct) {
                context.score += 20;
              }
            },
            guard: ({ context, event }) => event.correct,
          },
          {
            target: "providingSecondHint",
            guard: ({ context, event }) => event.correct,
          },
        ],
      },
      states: {
        Ask:{
          entry:  { 
            type: "spst.speak", 
            params: ({ context }) => ({ utterance: context.currentPerson?.hints[0] + "       Say my name!" }) },
          on: { SPEAK_COMPLETE: "Answer" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Answer" },
        },
        Answer: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                console.log(event.value);
                return { lastResult: event.value };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ lastResult: undefined }), // sempre que eu que eu quiser acessar esse lastResult, eu estou especificando onde eu estou armazenando essa informação. 2 coisas acontecem, 
            },
          },
        }
      },
      description:
        "This state represents the machine asking the player a question and providing the first hint.",
    },
    congratulating: {
      initial: "Continue",
      on: {
        CONTINUE: {
          target: "askingQuestion",
        },
        STOP: {
          target: "showingScore",
        },
      },
      states: {},
      description:
        "This state represents congratulating the player for a correct answer and asking if they want to continue playing.",
    },
    providingSecondHint: {
      on: {
        ANSWER: [
          {
            target: "congratulating",
            actions: ({ context, event }) => {
              if (event.correct) {
                context.score += 10;
              }
            },
            guard: ({ context, event }) => event.correct,
          },
          {
            target: "wrongAnswer",
            guard: ({ context, event }) => event.correct,
          },
        ],
      },
      description:
        "This state represents the machine giving a second hint after the player answers incorrectly to the first hint.",
    },
    showingScore: {
      type: "final",
      entry: ({ context }) => {
        console.log(`Game over! Your total score is: ${context.score}`);
      },
      description:
        "This state represents the end of the game, where the machine shows the player their total score.",
    },
    wrongAnswer: {
      on: {
        CONTINUE: {
          target: "askingQuestion",
        },
        STOP: {
          target: "showingScore",
        },
      },
      description:
        "This state represents informing the player that their answer is wrong and asking if they want to continue playing.",
    },
  },
});

const dmActor = createActor(machine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  console.group("State update");
  console.log("State value:", state.value);
  console.log("State context:", state.context);
  console.groupEnd();
});

export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.subscribe((snapshot) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });
}