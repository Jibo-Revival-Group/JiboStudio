import { useState } from 'react';
import { JIBO_API_MODULES, searchApiDocs } from '@jibo-studio/jibo-api-docs';
import './api-docs.css';

export function ApiDocsPanel() {
  const [query, setQuery] = useState('');
  const modules = searchApiDocs(query);

  return (
    <div className="api-docs">
      <h3>Jibo API Reference</h3>
      <input
        className="api-docs__search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search API..."
      />
      <div className="api-docs__list">
        {modules.map((mod) => (
          <details key={mod.name} className="api-docs__module">
            <summary>{mod.name}</summary>
            <p>{mod.description}</p>
            <ul>
              {mod.methods.map((m) => (
                <li key={m.name}>
                  <code>{m.name}</code>
                  <span>{m.description}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      {!query && (
        <p className="api-docs__footer">{JIBO_API_MODULES.length} modules documented</p>
      )}
    </div>
  );
}
