import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvents } from "./types";

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

interface GrammarEntry {
  person?: string;
  day?: string;
  time?: string;
}

const grammar: { [index: string]: GrammarEntry } = {
    vlad: { person: "Vladislav Maraev" },
    aya: { person: "Nayat Astaiza Soriano" },
    anna: { person: "Ana Paula Carvalho" },
    victoria: { person: "Victoria Daniilidou" },
  
    monday: { day: "Monday" },
    tuesday: { day: "Tuesday" },
    wednesday: { day: "Wednesday" },
    thursday: { day: "Thursday" },
  
    nine: { time: "09:00" },
    ten: { time: "10:00" },
    eleven: { time: "11:00" },
  
    yes: {},
    sure: {},
    okay: {},
    absolutely: {},
  
    no: {},
    "not really": {},
    nope: {},
  };

function isInGrammar(utterance: string) {
  return utterance.toLowerCase() in grammar;
}

function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}

const dmMachine = setup({
  types: {
    /** you might need to extend these */
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
    /** define your actions here */
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: {
          utterance: params.utterance,
        },
      }),
    "spst.listen": ({ context }) =>
      context.spstRef.send({
        type: "LISTEN",
      }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    lastResult: null, // variable -> Hypothesis []
    person: null, // variable -> any
    time: null, // variable -> any
    date: null, // variable -> any
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: { CLICK: "Greeting" },
    },
    Greeting: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "CreateAppointment",
            guard: ({ context }) => !!context.lastResult,
          },
          { target: ".NoInput" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", params: { utterance: `Hello! I'm your personal appointment assistant. Let's create an appointment?` } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                console.log(event.value[0]);
                return { lastResult: event.value };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ lastResult: null }), // sempre que eu que eu quiser acessar esse lastResult, eu estou especificando onde eu estou armazenando essa informação. 2 coisas acontecem, 
            },
          },
        },
      },
    },
    CreateAppointment: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "CreateAppointmentDate",
            guard: ({ context }) => !!context.person, // the "guard" is going to check if the value is true or false, empty or zero? it is an if condition.
          },
          { target: ".NoInput" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", params: { utterance: `Who are you meeting with?` } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                return { person: event.value };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ person: null }),
            },
          },
        },
      },
    },    
    CreateAppointmentDate: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "Question",
            guard: ({ context }) => !!context.date,
          },
          { target: ".NoInput" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", params: { utterance: `On which day is your meeting?` } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                return { date: event.value };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ date: null }),
            },
          },
        },
      },
    },
    Question: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "Option2",
            guard: ({ context }) => context.userInput == "Yes",
          },
          { target: "Option1" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", params: { utterance: `Will it take the whole day?` } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                return { userInput: event.value[0].utterance };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ userInput: null }),
            },
          },
        },
      },
    },
    Option1: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "ConfirmInfo",
            guard: ({ context }) => !!context.time, 
          },
          { target: "CreateAppointment" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", params: { utterance: `What time is your meeting?` } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                console.log("teste 0" + event.value);
                return { time: event.value };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ time: null }),
            },
          },
        },
      },
    },
    Option2: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "Done",
            guard: ({ context }) => context.userInput == "Yes" ,
          },
          { target: "CreateAppointment" },
        ],
      },
      states: {
        Prompt: {
          entry: {
            type: "spst.speak",
            params: ({ context }) => ({
              utterance: `Do you want me to create an appointment with ${context.person![0].utterance} on ${context.date![0].utterance} for the whole day?`,
            }),
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                return { userInput: event.value[0].utterance };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ userInput: null }),
            },
          },
        },
      },
    },
    ConfirmInfo: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "Done",
            guard: ({ context }) => context.userInput == "Yes",
          },
          { target: "CreateAppointment" },
        ],
      },
      states: {
        Prompt: {
          entry: { 
            type: "spst.speak",
            params: ({ context }) => ({
              utterance: `Do you want me to create an appointment with ${context.person![0].utterance} on ${context.date![0].utterance} for at ${context.time![0].utterance}?`,
            }),
           },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                console.log("teste1 :" + event.value[0].utterance);
                return { userInput: event.value[0].utterance };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ userInput: null }),
            },
          },
        },
      },
    },
    Done: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => ({
          utterance: `Your appointment has been created!`,
        }),
      },
      on: {
        CLICK: "Greeting",
      },
    },
  },
});

const dmActor = createActor(dmMachine, {
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