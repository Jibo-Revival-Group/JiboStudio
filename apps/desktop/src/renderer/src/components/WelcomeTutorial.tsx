import './tutorial.css';

interface WelcomeTutorialProps {
  onDismiss: () => void;
  onNewSkill: () => void;
  onOpenProject: () => void;
}

const STEPS = [
  {
    title: 'Create a JiboScript skill',
    body: 'New skills default to skill.jibo — a Python-like source language. Opening a project opens it automatically.',
  },
  {
    title: 'Write your skill',
    body: 'Describe flows, mims, behaviors, and rules in JiboScript. Save compiles to legacy artifacts.',
  },
  {
    title: 'Need the syntax?',
    body: 'Click the book icon in the sidebar for the JiboScript Guide — every keyword with examples.',
  },
  {
    title: 'Build for Jibo',
    body: 'Build runs the compiler then jibo-dev so your skill matches the on-robot format.',
  },
  {
    title: 'Connect a robot',
    body: 'Add the robot IP in the Robot panel and test the connection.',
  },
  {
    title: 'Sync & debug',
    body: 'Sync, run, and open the debugger on port 9191. Legacy visual projects still work.',
  },
];

export function WelcomeTutorial({ onDismiss, onNewSkill, onOpenProject }: WelcomeTutorialProps) {
  return (
    <div className="tutorial">
      <h3>Welcome to Jibo Studio</h3>
      <p className="tutorial__intro">
        Author skills in JiboScript. They compile to legacy Flow / Behavior / MIM / Rules so they
        still run on Jibo. Existing visual projects open as Legacy.
      </p>
      <ol className="tutorial__steps">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <strong>
              {i + 1}. {step.title}
            </strong>
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
