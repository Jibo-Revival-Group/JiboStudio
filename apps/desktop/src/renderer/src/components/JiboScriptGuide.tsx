import { useState, type ReactNode } from 'react';
import './jiboscript-guide.css';

interface GuideSection {
  id: string;
  title: string;
  body: ReactNode;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="guide-code">
      <code>{children.trim()}</code>
    </pre>
  );
}

const SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    title: 'What is JiboScript?',
    body: (
      <>
        <p>
          JiboScript is a small, Python-like language for writing Jibo skills. You write one{' '}
          <code>skill.jibo</code> file; Jibo Studio compiles it into the legacy Flow, Behavior,
          MIM, and Rule formats that <code>jibo-dev</code> and the robot already understand.
        </p>
        <ul>
          <li>Indentation-based blocks, like Python (spaces or tabs, just be consistent).</li>
          <li>
            <code>#</code> starts a comment.
          </li>
          <li>
            Strings use <code>"double"</code>, <code>'single'</code>, or{' '}
            <code>"""triple quotes"""</code> for multi-line text.
          </li>
          <li>
            Saving a <code>.jibo</code> file recompiles it automatically. Generated files under{' '}
            <code>src/flows/</code>, <code>src/behaviors/</code>, <code>src/rules/</code>,{' '}
            <code>mims/</code>, and <code>launch.rule</code> are read-only — edit{' '}
            <code>skill.jibo</code> instead.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'skill',
    title: 'skill — metadata',
    body: (
      <>
        <p>Every project needs exactly one metadata block. It becomes the skill's launch rule.</p>
        <Code>{`
skill:
  name = "my-skill"
  display = "My Skill"
  launch = "hey jibo do something"
  prompt = "Do something"
`}</Code>
        <ul>
          <li>
            <code>name</code> and <code>launch</code> are required.
          </li>
          <li>
            <code>display</code> defaults to <code>name</code>; <code>prompt</code> defaults to{' '}
            <code>launch</code> if omitted.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'flow',
    title: 'flow — conversation steps',
    body: (
      <>
        <p>
          A <code>flow</code> is a straight-line sequence of steps. Every skill needs a flow named{' '}
          <code>main</code> — it's what runs when the skill launches.
        </p>
        <Code>{`
flow main:
  call sayHello with notepad = notepad
  end

flow sayHello:
  announce announce_hello with currentSpeaker = notepad.currentSpeaker
  animate "happy"
  run playSound
  end
`}</Code>
        <table className="guide-table">
          <tbody>
            <tr>
              <td>
                <code>call NAME [with k = v, ...]</code>
              </td>
              <td>Run another flow as a subflow, optionally passing data.</td>
            </tr>
            <tr>
              <td>
                <code>announce MIM [with k = v, ...]</code>
              </td>
              <td>Speak a mim's prompt; continues automatically.</td>
            </tr>
            <tr>
              <td>
                <code>query MIM [with k = v, ...]</code>
              </td>
              <td>Speak a mim's prompt and listen for a response.</td>
            </tr>
            <tr>
              <td>
                <code>eval "js expression"</code>
              </td>
              <td>Run a snippet of JavaScript (e.g. update the notepad).</td>
            </tr>
            <tr>
              <td>
                <code>animate "animation-name"</code>
              </td>
              <td>Play a named robot animation.</td>
            </tr>
            <tr>
              <td>
                <code>run NAME</code>
              </td>
              <td>
                Run a <code>behavior</code> block as a subtree and wait for it to finish.
              </td>
            </tr>
            <tr>
              <td>
                <code>end</code>
              </td>
              <td>End the flow. Implied at the end if you leave it off.</td>
            </tr>
          </tbody>
        </table>
        <p>
          Bindings after <code>with</code> can reference dotted names like{' '}
          <code>notepad.currentSpeaker</code> — they become an object literal in the compiled
          flow.
        </p>
        <p className="guide-note">
          A <code>behavior</code> block only compiles a standalone <code>.bt</code> file — nothing
          runs it unless a flow calls it with <code>run NAME</code>.
        </p>
        <p className="guide-note">
          Not yet supported: conditional branching inside a flow. Keep decision logic in an{' '}
          <code>eval</code> step, or handle it with mim <code>query</code> responses and separate
          flows.
        </p>
      </>
    ),
  },
  {
    id: 'mim',
    title: 'mim — what Jibo says',
    body: (
      <>
        <p>
          A <code>mim</code> defines one or more spoken prompts. <code>announce</code> steps just
          speak; <code>query</code> steps speak and then listen.
        </p>
        <Code>{`
mim announce_hello:
  type = announcement
  say "Hello \${currentSpeaker}!" category = "Entry-Core" sub = "AN"

mim ask_ready:
  type = query
  rule = yesno
  say "Are you ready?"
`}</Code>
        <ul>
          <li>
            <code>type</code> is one of <code>announcement</code>, <code>query</code>, or{' '}
            <code>confirm</code>.
          </li>
          <li>
            Each <code>say</code> line adds one prompt. Add more than one for prompt variety —
            Jibo picks one at random. <code>category</code>/<code>sub</code> are optional (default
            to <code>Entry-Core</code>/<code>AN</code>).
          </li>
          <li>
            <code>rule</code> links a <code>query</code> mim to a <code>rule</code>/
            <code>raw_rule</code> block by name, so Jibo knows what responses to listen for.
          </li>
          <li>
            Use <code>{'${variableName}'}</code> inside a prompt string to interpolate data passed
            via the flow's <code>with</code> bindings.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'behavior',
    title: 'behavior — animations, audio, and scripts',
    body: (
      <>
        <p>
          A <code>behavior</code> is a small behavior tree — useful for playing audio or running
          script logic outside of the conversational flow. Call it from a <code>flow</code> with{' '}
          <code>run NAME</code> to actually execute it.
        </p>
        <Code>{`
behavior playSound:
  sequence:
    play_audio "FX_Bloop.mp3"

behavior pickOne:
  selector:
    play_audio "FX_Bloop.mp3"
    play_audio "FX_Chirp.mp3"

flow sayHello:
  run playSound
  end
`}</Code>
        <table className="guide-table">
          <tbody>
            <tr>
              <td>
                <code>sequence:</code>
              </td>
              <td>Run every child in order; stops if one fails.</td>
            </tr>
            <tr>
              <td>
                <code>selector:</code>
              </td>
              <td>Try each child in order until one succeeds.</td>
            </tr>
            <tr>
              <td>
                <code>play_audio "file.mp3"</code>
              </td>
              <td>Play a bundled audio asset.</td>
            </tr>
            <tr>
              <td>
                <code>script "js code"</code>
              </td>
              <td>Run arbitrary JavaScript as a leaf node.</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'rule',
    title: 'rule / raw_rule — what Jibo listens for',
    body: (
      <>
        <p>
          Rules define speech Jibo recognizes. Use the simple <code>rule</code> form for a list of
          exact phrases, or <code>raw_rule</code> to drop in real NLU grammar for anything more
          advanced (wildcards, factories, variables).
        </p>
        <Code>{`
rule confirmations:
  match "yes" action = "confirm"
  match "no" action = "deny"

raw_rule trigger_skill: """
TopRule = $* (
    ( (say $hello){action='sayHello'} ) |
    ( (say $goodbye){action='sayGoodbye'} )
) $*;

hello = (hello | hi);
goodbye = (good bye) | goodbye | bye;
"""
`}</Code>
        <ul>
          <li>
            <code>rule</code> phrases compile into a simple NLU grammar automatically — good
            enough for exact-match commands.
          </li>
          <li>
            <code>raw_rule</code> passes its triple-quoted body straight through to the{' '}
            <code>.rule</code> file, so you can use every NLU grammar feature Jibo supports.
          </li>
          <li>
            The skill's launch phrase (from the <code>skill:</code> block) is compiled into{' '}
            <code>launch.rule</code> automatically — you don't need a rule for it.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'workflow',
    title: 'Building and running',
    body: (
      <>
        <ul>
          <li>
            <strong>Save</strong> (<code>Ctrl/Cmd+S</code>) recompiles <code>skill.jibo</code> into
            legacy artifacts in the background — check the <strong>Output</strong> panel for
            compile errors.
          </li>
          <li>
            <strong>Build</strong> compiles JiboScript, then runs <code>jibo-dev build</code> to
            produce the final bundle Jibo runs.
          </li>
          <li>
            <strong>Watch</strong> keeps rebuilding as you edit — useful while iterating.
          </li>
          <li>
            Once built, use the <strong>Robot</strong> panel to sync and run the skill on a
            connected Jibo.
          </li>
          <li>
            Renaming or deleting a flow/mim/behavior/rule in <code>skill.jibo</code> automatically
            removes its stale generated file on the next compile.
          </li>
        </ul>
      </>
    ),
  },
];

export function JiboScriptGuide() {
  const [openId, setOpenId] = useState<string>(SECTIONS[0]?.id ?? '');

  return (
    <div className="guide">
      <h3>JiboScript Guide</h3>
      <p className="guide-intro">
        A quick reference for the JiboScript language. See also the full write-up at{' '}
        <code>docs/JIBOSCRIPT.md</code> in the project repository.
      </p>
      <div className="guide-sections">
        {SECTIONS.map((section) => {
          const expanded = openId === section.id;
          return (
            <div className="guide-section" key={section.id}>
              <button
                type="button"
                className="guide-section__header"
                onClick={() => setOpenId(expanded ? '' : section.id)}
                aria-expanded={expanded}
              >
                <span className="guide-section__chevron">{expanded ? '\u2212' : '+'}</span>
                {section.title}
              </button>
              {expanded && <div className="guide-section__body">{section.body}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
