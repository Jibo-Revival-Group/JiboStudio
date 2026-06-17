import './tutorial.css';

interface WelcomeTutorialProps {
  onDismiss: () => void;
  onNewSkill: () => void;
  onOpenProject: () => void;
}

const STEPS = [
  { title: 'Create a skill', body: 'Use New Skill wizard with the starter-skill template.' },
  { title: 'Edit visually', body: 'Open .flow, .bt, .mim, and .rule files in visual editors.' },
  { title: 'Build', body: 'Click Build to compile with bundled jibo-dev toolchain.' },
  { title: 'Connect robot', body: 'Enter robot IP/hostname in the Robot panel.' },
  { title: 'Sync & debug', body: 'Sync to robot, run skill, use debugger on port 9191.' },
];

export function WelcomeTutorial({ onDismiss, onNewSkill, onOpenProject }: WelcomeTutorialProps) {
  return (
    <div className="tutorial">
      <h3>Welcome to Jibo Studio</h3>
      <p className="tutorial__intro">
        Create on-robot Jibo skills without the legacy Atom SDK. All tools are bundled — no pvindex access needed.
      </p>
      <ol className="tutorial__steps">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <strong>{i + 1}. {step.title}</strong>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
      <div className="tutorial__actions">
        <button type="button" onClick={onNewSkill}>
          New Skill
        </button>
        <button type="button" onClick={onOpenProject}>
          Open Project
        </button>
        <button type="button" className="tutorial__dismiss" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
