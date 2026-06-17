export interface ApiModule {
  name: string;
  description: string;
  methods: { name: string; description: string }[];
}

export const JIBO_API_MODULES: ApiModule[] = [
  {
    name: 'jibo.init',
    description: 'Initialize the skill runtime and attach to the face display.',
    methods: [
      { name: "init('face', callback)", description: 'Start skill with 1280x720 face element.' },
    ],
  },
  {
    name: 'jibo.flow',
    description: 'Run and manage skill flows compiled from .flow files.',
    methods: [
      { name: 'run(flow, params, callback)', description: 'Execute a compiled flow module.' },
      { name: 'stop()', description: 'Stop the current flow.' },
    ],
  },
  {
    name: 'jibo.bt',
    description: 'Behavior tree runtime for .bt files.',
    methods: [{ name: 'run(behavior, notepad)', description: 'Execute a behavior tree.' }],
  },
  {
    name: 'jibo.listen',
    description: 'Speech recognition and NLU integration.',
    methods: [
      { name: 'start(options)', description: 'Begin listening for utterances.' },
      { name: 'stop()', description: 'Stop listening.' },
    ],
  },
  {
    name: 'jibo.express',
    description: 'Body motion, LEDs, and expressive output.',
    methods: [{ name: 'playAnimation(path)', description: 'Play a body animation.' }],
  },
  {
    name: 'jibo.show',
    description: 'Screen graphics via PixiJS on the face display.',
    methods: [{ name: 'render(content)', description: 'Render graphics to face.' }],
  },
  {
    name: 'jibo.sound',
    description: 'Audio playback (Electron skill host).',
    methods: [{ name: 'play(path)', description: 'Play an audio file.' }],
  },
  {
    name: 'jibo.know',
    description: 'Knowledge base read/write for user data.',
    methods: [{ name: 'get(key)', description: 'Read a KB value.' }],
  },
];

export function searchApiDocs(query: string): ApiModule[] {
  const q = query.toLowerCase();
  if (!q) return JIBO_API_MODULES;
  return JIBO_API_MODULES.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.methods.some((method) => method.name.toLowerCase().includes(q)),
  );
}
