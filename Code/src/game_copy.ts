import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { ChatbotContext, ChatbotEvent } from "./types";
import { FamousPeople } from "./famous";
import { stopGameNow } from "./stopGame";

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
    lastResult: "",
    currentPerson: undefined,
    currentPersonIndex: 0,
    currentHintIndex: 0,
    rightAnswer: undefined,
  }),
  id: "guessHistoricalFigures",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: {
        CLICK: "Welcome", // Only start when clicking the button
        ASRTTS_READY: "Welcome" // Transition when ready
      },
    },



    Welcome: {
      entry: [
        {
          type: "spst.speak",
          params: { utterance: "Welcome to the Who am I game! I'm Einstein White, your teacher and opponent. This is how this game works, you have to guess who the historical figure is based on the hints I will give you. After listening to the first hint, you have to say the person's name. If you don't know it, I will give you another hint. If you guess correctly, you score 10 points. If you miss, then zero point. There are 10 questions. Ready to start? Here is the first hint." }
        }],
      on: {
        SPEAK_COMPLETE: "askingQuestion0", // It specify transition stage.
      },
    },

    askingQuestion0: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[0].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion0", // It specify transition stage.
      }
    },
    listenFirstQuestion0: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[0].name,
            target: "listenCompleteFirstQuestion0",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion0",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion0: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer0",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer0",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer0: {
      entry: ({ type: "spst.speak", params: { utterance: "You are not in danger, you are the danger! Good job!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion1", // It specify transition stage.
      }
    },
    wrongAnswer0: {
      entry: ({ type: "spst.speak", params: { utterance: `It is not that I am so smart; it is just that I stay with problems longer. So, try again.` } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint0", // It specify transition stage.
      }
    },
    providingSecondHint0: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[0].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion0", // It specify transition stage.
      }
    },
    listenSecondQuestion0: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion0",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[0].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion0",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion0: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer0"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer0_2"
          },
        ]
      }
    },
    wrongAnswer0_2: {
      entry: ({ type: "spst.speak", params: { utterance: "It’s not that I’m so smart; it’s just that I stay with problems longer." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion1", // It specify transition stage.
      }
    },

    // ASKING QUESTION 1
    askingQuestion1: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[1].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion1", // It specify transition stage.
      }
    },
    listenFirstQuestion1: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[1].name,
            target: "listenCompleteFirstQuestion1",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion1",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion1: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer1",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer1",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer1: {
      entry: ({ type: "spst.speak", params: { utterance: "You are not in danger, you are the danger! Good job!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion2", // It specify transition stage.
      }
    },
    wrongAnswer1: {
      entry: ({ type: "spst.speak", params: { utterance: `It is not that I am so smart; it is just that I stay with problems longer. So, try again.` } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint1", // It specify transition stage.
      }
    },
    providingSecondHint1: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[1].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion1", // It specify transition stage.
      }
    },
    listenSecondQuestion1: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion1",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[1].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion1",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion1: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer1"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer1_2"
          },
        ]
      }
    },
    wrongAnswer1_2: {
      entry: ({ type: "spst.speak", params: { utterance: "It’s not that I’m so smart; it’s just that I stay with problems longer." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion2", // It specify transition stage.
      }
    },
    // ASKING QUESTION 2
    askingQuestion2: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[2].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion2", // It specify transition stage
      }
    },
    listenFirstQuestion2: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[2].name,
            target: "listenCompleteFirstQuestion2",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion2",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion2: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer2",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer2",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer2: {
      entry: ({ type: "spst.speak", params: { utterance: "Genius is 1% talent and 99% hard work. You nailed it!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion3", // It specify transition stage.
      }
    },
    wrongAnswer2: {
      entry: ({ type: "spst.speak", params: { utterance: "Anyone who has never made a mistake has never tried anything new." } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint2", // It specify transition stage.
      }
    },
    providingSecondHint2: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[2].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion2", // It specify transition stage.
      }
    },
    listenSecondQuestion2: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion2",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[2].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion2",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion2: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer2"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer2_2"
          },
        ]
      }
    },
    wrongAnswer2_2: {
      entry: ({ type: "spst.speak", params: { utterance: "If guessing were a crime, you'd be wanted by the DEA." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion3", // It specify transition stage.
      }
    },
    // askingQuestion3: 
    askingQuestion3: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[3].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion3", // It specify transition stage.
      }
    },
    listenFirstQuestion3: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[3].name,
            target: "listenCompleteFirstQuestion3",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion3",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion3: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer3",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer3",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer3: {
      entry: ({ type: "spst.speak", params: { utterance: "Correct! Consider that a quantum leap forward!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion4", // It specify transition stage.
      }
    },
    wrongAnswer3: {
      entry: ({ type: "spst.speak", params: { utterance: "That guess was… let's call it experimental. Let's see if you guess it right next time." } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint3", // It specify transition stage.
      }
    },
    providingSecondHint3: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[3].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion3", // It specify transition stage.
      }
    },
    listenSecondQuestion3: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion3",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[3].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion3",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion3: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer3"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer3_2"
          },
        ]
      }
    },
    wrongAnswer3_2: {
      entry: ({ type: "spst.speak", params: { utterance: "A stumble is not a fall—unless you stop walking. So, walk on." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion4", // It specify transition stage.
      }
    },
    // askingQuestion4:
    askingQuestion4: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[4].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion4", // It specify transition stage.
      }
    },
    listenFirstQuestion4: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[4].name,
            target: "listenCompleteFirstQuestion4",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion4",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion4: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer4",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer4",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer4: {
      entry: ({ type: "spst.speak", params: { utterance: "You are not in danger, you are the danger! Good job!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion5", // It specify transition stage.
      }
    },
    wrongAnswer4: {
      entry: ({ type: "spst.speak", params: { utterance: "You're not done until you've won—and you're closer than you think." } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint4", // It specify transition stage.
      }
    },
    providingSecondHint4: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[4].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion4", // It specify transition stage.
      }
    },
    listenSecondQuestion4: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion4",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[4].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion4",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion4: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer4"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer4_2"
          },
        ]
      }
    },
    wrongAnswer4_2: {
      entry: ({ type: "spst.speak", params: { utterance: "Failure is success in progress. You'll get it right next time!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion5", // It specify transition stage.
      }
    },
    // ASKING QUESTION 5
    askingQuestion5: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[5].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion5", // It specify transition stage.
      }
    },
    listenFirstQuestion5: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[5].name,
            target: "listenCompleteFirstQuestion5",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion5",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion5: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer5",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer5",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer5: {
      entry: ({ type: "spst.speak", params: { utterance: "You are not in danger, you are the danger! Good job!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion6", // It specify transition stage.
      }
    },
    wrongAnswer5: {
      entry: ({ type: "spst.speak", params: { utterance: "It is not that I am so smart; it is just that I stay with problems longer. So, try again." } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint5", // It specify transition stage.
      }
    },
    providingSecondHint5: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[5].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion5", // It specify transition stage.
      }
    },
    listenSecondQuestion5: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion5",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[5].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion5",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion5: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer5"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer5_2"
          },
        ]
      }
    },
    wrongAnswer5_2: {
      entry: ({ type: "spst.speak", params: { utterance: "The only source of knowledge is experience. Ready to gain some?" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion6", // It specify transition stage.
      }
    },
    // ASKING QUESTION 6
    askingQuestion6: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[6].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion6", // It specify transition stage.
      }
    },
    listenFirstQuestion6: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[6].name,
            target: "listenCompleteFirstQuestion6",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion6",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion6: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer6",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer6",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer6: {
      entry: ({ type: "spst.speak", params: { utterance: "I respect the science—and I respect your answer. Good Job!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion7", // It specify transition stage.
      }
    },
    wrongAnswer6: {
      entry: ({ type: "spst.speak", params: { utterance: `It is not that I am so smart; it is just that I stay with problems longer. So, try again.` } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint6", // It specify transition stage.
      }
    },
    providingSecondHint6: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[6].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion6", // It specify transition stage.
      }
    },
    listenSecondQuestion6: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion6",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[6].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion6",
            actions: assign(({  }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion6: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer6"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer6_2"
          },
        ]
      }
    },
    wrongAnswer6_2: {
      entry: ({ type: "spst.speak", params: { utterance: "It's not that I'm so smart; its just that I stay with problems longer." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion7", // It specify transition stage.
      }
    },
    // ASKING QUESTION 7
    askingQuestion7: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[7].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion7", // It specify transition stage.
      }
    },
    listenFirstQuestion7: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[7].name,
            target: "listenCompleteFirstQuestion7",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion7",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({ }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion7: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer7",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer7",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer7: {
      entry: ({ type: "spst.speak", params: { utterance: "Two things are infinite: the universe and your potential. Well done!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion8", // It specify transition stage.
      }
    },
    wrongAnswer7: {
      entry: ({ type: "spst.speak", params: { utterance: "Anyone who has never made a mistake has never tried anything new. You'll get it right next time, I'm sure!" } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint7", // It specify transition stage.
      }
    },
    providingSecondHint7: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[7].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion7", // It specify transition stage.
      }
    },
    listenSecondQuestion7: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion7",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[7].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion7",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({ }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion7: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer7"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer7_2"
          },
        ]
      }
    },
    wrongAnswer7_2: {
      entry: ({ type: "spst.speak", params: { utterance: "Don't worry about mistakes. Worry about what you learn from them." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion8", // It specify transition stage.
      }
    },
    // ASKING QUESTION 8
    askingQuestion8: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[8].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion8", // It specify transition stage.
      }
    },
    listenFirstQuestion8: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[8].name,
            target: "listenCompleteFirstQuestion8",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion8",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({ }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion8: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer8",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer8",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer8: {
      entry: ({ type: "spst.speak", params: { utterance: "You are not in danger, you are the danger! Good job!" } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion9", // It specify transition stage.
      }
    },
    wrongAnswer8: {
      entry: ({ type: "spst.speak", params: { utterance: "You're not done until you've won—and you're closer than you think. You'll get next question right, I'm sure!" } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint8", // It specify transition stage.
      }
    },
    providingSecondHint8: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[8].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion8", // It specify transition stage.
      }
    },
    listenSecondQuestion8: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion8",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[8].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion8",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({ }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion8: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer8"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer8_2"
          },
        ]
      }
    },
    wrongAnswer8_2: {
      entry: ({ type: "spst.speak", params: { utterance: "Don't worry about mistakes. Worry about what you learn from them." } }),
      on: {
        SPEAK_COMPLETE: "askingQuestion9", // It specify transition stage.
      }
    },
    // ASKING QUESTION 9
    askingQuestion9: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[9].hints[0] } }),
      on: {
        SPEAK_COMPLETE: "listenFirstQuestion9", // It specify transition stage.
      }
    },
    listenFirstQuestion9: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }) => event.value[0].utterance === FamousPeople[9].name,
            target: "listenCompleteFirstQuestion9",
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            guard: ({ event }) => event.value[0].utterance.toLowerCase() === stopGameNow[0].stopping,
            target: "exitAnytime",
            //actions: assign(({ context }) => ({
              //score: context.score + 10,
              //rightAnswer: "yes"
            //})),
          },
          {
            target: "listenCompleteFirstQuestion9",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({ }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteFirstQuestion9: {
      on: {
        LISTEN_COMPLETE: [
          {
            target: "rightAnswer9",
            guard: ({ context }) => context.rightAnswer === "yes",
          },
          {
            target: "wrongAnswer9",
            guard: ({ context }) => context.rightAnswer === "no",
          }
        ]
      }   // WE ADDED AN ARRAY [] OF CONDITIONS above.  
    },
    rightAnswer9: {
      entry: ({ type: "spst.speak", params: { utterance: "Eureka! Even Archimedes would be jealous." } }),
      on: {
        SPEAK_COMPLETE: "showingScore", // It specify transition stage.
      }
    },
    wrongAnswer9: {
      entry: ({ type: "spst.speak", params: { utterance: "It is not that I am so smart; it is just that I stay with problems longer. So, try again." } }),
      on: {
        SPEAK_COMPLETE: "providingSecondHint9", // It specify transition stage.
      }
    },
    providingSecondHint9: {
      entry: ({ type: "spst.speak", params: { utterance: FamousPeople[9].hints[1]  } }),
      on: {
        SPEAK_COMPLETE: "listenSecondQuestion9", // It specify transition stage.
      }
    },
    listenSecondQuestion9: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: [
          {
            target: "listenCompleteSecondQuestion9",
            guard: ({ event }) => event.value[0].utterance === FamousPeople[9].name,
            actions: assign(({ context }) => ({
              score: context.score + 10,
              rightAnswer: "yes"
            })),
          },
          {
            target: "listenCompleteSecondQuestion9",
            actions: assign(({ }) => ({
              rightAnswer: "no",
            })),
          },
        ],
        ASR_NOINPUT: {
          actions: assign(({  }) => ({
            rightAnswer: "no",
          })),
        },
      },
    },
    listenCompleteSecondQuestion9: {
      on: {
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.rightAnswer === "yes",
            target: "rightAnswer9"
          },
          {
            guard: ({ context }) => context.rightAnswer === "no",
            target: "wrongAnswer9_2"
          },
        ]
      }
    },
    wrongAnswer9_2: {
      entry: ({ type: "spst.speak", params: { utterance: `Failure is success in progress. I'm sure you'll get it right next time.` } }),
      on: {
        SPEAK_COMPLETE: "showingScore", // It specify transition stage.
      }
    },

    // exitAnytime: {
    //     entry: ({ type: "spst.speak", params: { utterance: `You chose to exit the game.` } }),
    //   on: {
    //     SPEAK_COMPLETE: "showingScore",
    //   }
    //     },
    
    exitAnytime: {
        entry: {
          type: "spst.speak",
          params: ({  }) => ({
            utterance: `You chose to terminate the game.`,
          }),
        },
        on: { SPEAK_COMPLETE: "Done" },
      },
    Done: {
            on: {
              CLICK: "Prepare",
            },
    },


    showingScore: {
      entry: {type: "spst.speak", params:
      ({ context }) => ({utterance: `That was fun. But don't think for a second that you've mastered history. Next time, I'll bring the real challenge. And when that happens... I'll still be the one who knocks...        Your total score is: ${context.score}.`})},
      on:{
        SPEAK_COMPLETE: "finalState",
    }
  },
  finalState: {},
}
}
);

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