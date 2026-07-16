# The JiboScript Language

JiboScript is a small, Python-like language for writing Jibo skills. You write one
`skill.jibo` source file; Jibo Studio compiles it into the legacy **Flow**, **Behavior**, **MIM**,
and **Rule** formats that `jibo-dev` and the robot already understand. The compiled files are
byte-for-byte the same kind of JSON/text `jibo-dev` has always consumed — JiboScript is purely a
friendlier *source* format, not a new runtime.

This document is the full language reference. A condensed version of this guide is also available
inside Jibo Studio itself (the "JiboScript Guide" icon in the sidebar).

- [Quick start](#quick-start)
- [Lexical rules](#lexical-rules)
- [`skill` — metadata](#skill--metadata)
- [`flow` — conversation steps](#flow--conversation-steps)
- [`mim` — what Jibo says](#mim--what-jibo-says)
- [`behavior` — animations, audio, and scripts](#behavior--animations-audio-and-scripts)
- [`rule` / `raw_rule` — what Jibo listens for](#rule--raw_rule--what-jibo-listens-for)
- [Compiling and building](#compiling-and-building)
- [Current limitations](#current-limitations)
- [Full example](#full-example)

## Quick start

```python
skill:
  name = "my-skill"
  display = "My Skill"
  launch = "hey jibo do something"
  prompt = "Do something"

flow main:
  call sayHello with notepad = notepad
  end

flow sayHello:
  announce announce_hello with currentSpeaker = notepad.currentSpeaker
  end

mim announce_hello:
  type = announcement
  say "Hello ${currentSpeaker}!" category = "Entry-Core" sub = "AN"
```

Saving `skill.jibo` (or clicking **Build**) compiles this into:

```
launch.rule
src/flows/main.flow
src/flows/sayHello.flow
mims/announce_hello.mim
```

Those files are the exact legacy artifact formats `jibo-dev build` has always consumed. From
there, the existing Jibo toolchain takes over unchanged.

## Lexical rules

- **Indentation** defines blocks, like Python. Use spaces or tabs consistently within a block;
  each new indent level opens a nested block, each dedent closes one.
- `#` starts a line comment. Comments don't affect indentation.
- Strings can be:
  - `"double quoted"` or `'single quoted'` — single-line, support `\"`/`\'`/`\\` escapes.
  - `"""triple quoted"""` — can span multiple lines; common leading whitespace is stripped, so
    you can indent the body to match the surrounding code. Used for `raw_rule` NLU grammar bodies.
- Keywords: `skill`, `flow`, `mim`, `behavior`, `rule`, `raw_rule`, `call`, `announce`, `query`,
  `eval`, `animate`, `run`, `end`, `with`, `say`, `type`, `sequence`, `selector`, `play_audio`,
  `script`, `match`.
- A single `skill.jibo` file can declare any number of `flow`, `mim`, `behavior`, and `rule` /
  `raw_rule` blocks, plus exactly one `skill:` metadata block.

## `skill` — metadata

Every project needs exactly one metadata block:

```python
skill:
  name = "my-skill"
  display = "My Skill"
  launch = "hey jibo do something"
  prompt = "Do something"
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Skill package name. |
| `launch` | yes | The phrase that launches the skill; compiled into `launch.rule`. |
| `display` | no | Defaults to `name`. Shown as the skill's display name. |
| `prompt` | no | Defaults to `launch`. |

## `flow` — conversation steps

A `flow` is a straight-line sequence of steps compiled into a `.flow` JSON graph
(`Flow.Begin → steps → Flow.End`). Every skill needs a flow named **`main`** — the starter
`src/index.ts` requires `./flows/main`, and that's what runs when the skill launches.

```python
flow main:
  call sayHello with notepad = notepad
  end

flow sayHello:
  announce announce_hello with currentSpeaker = notepad.currentSpeaker
  animate "happy"
  run playSound
  end
```

| Step | Compiles to | Description |
|---|---|---|
| `call NAME [with k = v, ...]` | `Flow.Subflow` | Runs another flow as a subflow. |
| `announce MIM [with k = v, ...]` | `Mim.Announcement` | Speaks a mim's prompt, then continues. |
| `query MIM [with k = v, ...]` | `Mim.Question` | Speaks a mim's prompt and listens for a response. |
| `eval "js expression"` | `Flow.Eval` | Runs a JavaScript snippet (e.g. to update the notepad). |
| `animate "name"` | `PlayAnimation` | Plays a named robot animation. |
| `run NAME` | `Subtree` | Runs a `behavior` block (a `.bt` file) as a subtree and waits for it to finish. |
| `end` | `Flow.End` | Ends the flow. Implied automatically if omitted. |

`run NAME` is how a flow actually triggers a `behavior` block — a `behavior` on its own only
compiles a standalone `.bt` file; nothing runs it unless a flow calls it with `run`. `NAME` must
match a `behavior` declared somewhere in the same file.

Bindings after `with` are `key = value` pairs, comma-separated. Values can be:

- a dotted identifier, e.g. `notepad.currentSpeaker` (passed through verbatim as a JS expression)
- a string literal, e.g. `with greeting = "hi"`

These become the flow node's `inputParameters` / `getPromptData` object literal, exactly like a
hand-written legacy flow would.

## `mim` — what Jibo says

A `mim` defines one or more spoken prompts.

```python
mim announce_hello:
  type = announcement
  say "Hello ${currentSpeaker}!" category = "Entry-Core" sub = "AN"

mim ask_ready:
  type = query
  rule = yesno
  say "Are you ready?"
  say "Ready to go?"
```

- `type` is one of `announcement`, `query`, or `confirm`.
- Each `say "..."` line adds one prompt entry. Add multiple `say` lines for prompt variety —
  Jibo picks one at random at runtime. `category` and `sub` are optional and default to
  `Entry-Core` / `AN`.
- `rule = NAME` links a `query`/`confirm` mim to a `rule`/`raw_rule` block by name, telling Jibo
  what kind of response to listen for. The compiler checks that `NAME` actually exists.
- Use `${variableName}` inside a prompt string to interpolate data passed to the mim step via the
  flow's `with` bindings (this is passed straight through — the prompt template syntax is the same
  one legacy `.mim` files already use).
- A `mim` with no `say` lines compiles with a placeholder prompt and a warning — always add at
  least one `say`.

## `behavior` — animations, audio, and scripts

A `behavior` is a small behavior tree, useful for audio/script logic outside of the
conversational flow. A `behavior` block only compiles a `.bt` file — use `run NAME` in a `flow`
to actually execute it (see [`flow`](#flow--conversation-steps) above).

```python
behavior playSound:
  sequence:
    play_audio "FX_Bloop.mp3"

behavior pickOne:
  selector:
    play_audio "FX_Bloop.mp3"
    play_audio "FX_Chirp.mp3"
```

| Node | Compiles to | Description |
|---|---|---|
| `sequence:` | `Sequence` | Runs every child in order; stops (fails) if one fails. |
| `selector:` | `Switch` | Tries each child in order until one succeeds. |
| `play_audio "file.mp3"` | `PlayAudio` | Plays a bundled audio asset. |
| `script "js code"` | `ExecuteScript` | Runs arbitrary JavaScript as a leaf node. |

`sequence`/`selector` blocks can nest inside each other freely.

## `rule` / `raw_rule` — what Jibo listens for

Rules define speech Jibo recognizes.

```python
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
```

- `rule NAME:` followed by one or more `match "phrase" [action = "name"]` lines compiles a simple
  NLU grammar automatically — good for exact-match commands.
- `raw_rule NAME: """ ... """` passes its triple-quoted body straight through to the `.rule`
  file, so you can use every NLU grammar feature Jibo's parser supports (wildcards, factories,
  variables, weighted alternatives, etc). This is an escape hatch for anything the simple `rule`
  form can't express.
- The skill's launch phrase (from the `skill:` block) is compiled into `launch.rule`
  automatically — you don't need to write a rule for it yourself.
- A `mim`'s `rule = NAME` field must reference a rule/raw_rule declared somewhere in the same file.

## Compiling and building

- **Save** (`Ctrl/Cmd+S`) recompiles `skill.jibo` into legacy artifacts in the background. Compile
  errors and warnings show up as red/yellow underlines in the editor and in the **Output** panel.
- **Build** compiles JiboScript, then runs `jibo-dev build` to produce the final on-robot bundle.
- **Watch** keeps recompiling and rebuilding as you edit.
- Generated files under `src/flows/`, `src/behaviors/`, `src/rules/`, `mims/`, and `launch.rule`
  are read-only in the editor — always edit `skill.jibo`, never the generated output.
- Renaming or removing a `flow`/`mim`/`behavior`/`rule` block automatically deletes its stale
  generated file on the next compile, so old artifacts don't pile up.
- Once built, use the **Robot** panel in Jibo Studio to sync and run the skill on a connected
  Jibo, same as a legacy project.

## Current limitations

JiboScript intentionally covers the common cases first. Not yet supported (use the escape hatches
noted, or fall back to editing a legacy project for these):

- **Conditional branching inside a flow.** Flows are a straight line of steps. Keep decision logic
  in an `eval` step, or split the decision into separate flows launched by different `query`
  responses / rule actions.
- **Custom flow node types** beyond `call`/`announce`/`query`/`eval`/`animate`/`run`/`end` (e.g.
  parallel branches, timeouts, menus). Use `eval` for anything that needs custom JS, or hand-edit
  the compiled `.flow` file for one-off cases (note: it will be overwritten on the next compile).
- **Behavior node types** beyond `sequence`/`selector`/`play_audio`/`script` (e.g. `Parallel`,
  `Random`, `Listen`, `LookAt`, decorators like `Case`/timeouts). Use `script` to invoke anything
  more advanced directly in JS, or edit a legacy (non-DSL) project for full behavior-tree control.

## Full example

This is the DSL starter template (`vendor/templates/starter-skill-dsl/skill.jibo`), showing every
construct together:

```python
skill:
  name = "starter-skill"
  display = "template"
  launch = "what time is it"
  prompt = "Do something"

flow main:
  call sayHello with notepad = notepad
  end

flow sayHello:
  announce announce_hello with currentSpeaker = notepad.currentSpeaker
  run playSound
  end

mim announce_hello:
  type = announcement
  say "Hello ${currentSpeaker}!" category = "Entry-Core" sub = "AN"

behavior playSound:
  sequence:
    play_audio "FX_Bloop.mp3"

raw_rule trigger_skill: """
# Allow phrases like "say hello", "play a bloop", "say goodbye"
TopRule = $* (
    ( (say $hello){action='sayHello'} ) |
    ( ($play (*a) $sound{sound=sound._item}){action='playSound'} ) |
    ( (say $goodbye){action='sayGoodbye'} )
) $*;

sound @= ($w){_item=_parsed};
play = (play | make);
hello = (hello | hi);
goodbye = (good bye) | goodbye | bye;
"""

raw_rule yesno: """
TopRule = $* (
    $yesno{yesNo = yesno._yes_no}
) $*;

yesno = ($factory:yes_no{_yes_no = yes_no._nl} | ok{_yes_no = 'yes'} | alright{_yes_no = 'yes'} | ready{_yes_no = 'yes'} );
"""
```
