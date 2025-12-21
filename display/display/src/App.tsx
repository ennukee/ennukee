import ascii from './util/ascii';
import './App.css'
import data from './assets/data_ranked.json';

const lines = [
  ['ennukee'],
  ['profession', 'full-stack software engineer'],
  ['company', 'google quantum ai'],
  ['past roles', 'google health ai, vestmark'],
  [],
  ['tech.stack.web', 'react, nextjs, vite, js, ts, css, sass'],
  ['', 'emotionjs, styled components, react native'],
  ['tech.stack.backend', 'nodejs, python, express/fastify, git'],
  ['', 'jenkins, atlassian, docker, cypress'],
  ['', 'digitalocean, java, kotlin'],
  [],
  ['interests', 'gaming, AI, digital culture, media,'],
  ['', 'interactive animated media (vtubing, etc)'],
  ['about'],
  ['about me', 'hey there! i\'m dylan, a software engineer based in the'],
  ['', 'united states. all of my professional work is for'],
  ['', 'proprietary systems, so please understand i cannot'],
  ['', 'disclose specifics. however, most of my personal'],
  ['', 'projects are in public repos on github!'],
  ['my work', 'i build all kinds of things, but professionally focus'],
  ['', 'on data-heavy full stack web applications, utilizing'],
  ['', 'primarily javascript web frameworks and a variety of'],
  ['', 'backend tech stacks'],
  ['contact'],
  ['email', 'dylanvolibowers@gmail.com'],
  ['linkedin', 'dylan-bowers'],
  ['twitter', 'priestismjp'],
  ['discord', 'ennukee'],
]

// dont ask
const linesValueColors = [
  -1,
  0, 1, 0,
  -1,
  1, 1,
  0, 0, 0,
  -1,
  1, 1,
  -1,
  0, 0, 0, 0, 0,
  1, 1, 1, 1,
  -1,
  0, 1, 0, 1,
]

const lineLength = 65;
const languageLineLength = 56;
const languageLineEndingLength = 15;

function App() {

  return (<>
    <div className="app-container">
      <div className="container">
        <pre>{ascii}</pre>
      </div>
      <div className="info">
        {lines.map((line, index) => {
          if (line.length === 0) {
            return <div key={index}>&nbsp;</div>;
          }
          
          const [left, right] = line;

          let spacing = (left ? '·' : '\u00A0').repeat(
            Math.max(
              0,
              lineLength - (left?.length || 0) - (right?.length || 0)
            )
          );
          spacing = '\u00A0' + spacing.slice(1, -1) + '\u00A0';

          return (
            <div className={right ? '' : 'header-row'} key={index}>
              {right ? '\u00A0'.repeat(2) : ''}
              <span className={right ? 'label' : 'header'}>{left}</span>
              {right ? (
                <>
                  <span className="spacing">{spacing}</span>
                  <span className={linesValueColors[index] === 0 ? 'value' : 'value2'}>{right}</span>
                </>
              ) : (
                <div className="header-line" />
              )}
            </div>
          );
        })}
      </div>
    </div>
    <div className="language-stats-section">
      <div className="header-row language-section">
        <span className="header">language statistics in personal projects only</span>
        <div className="header-line" />
      </div>
      <div className="stats-container" style={{ display: 'flex', gap: '2rem' }}>
        <div className="stats-table">
          {Object.entries(data).slice(0, 6).map(([language, stats], index) => {
        const label = `#${index + 1}`;
        const bytes = `${stats.bytes.toLocaleString()} bytes`;
        const loc = `${stats.estimatedLoC.toLocaleString()} lines`;
        const spacing1 = '·'.repeat(4 - label.length);
        const spacing2 = '·'.repeat(Math.max(
          0,
          languageLineLength - (label.length + language.length + (4 - label.length)) - bytes.length - languageLineEndingLength,
        ));
        const spacing3 = '·'.repeat(Math.max(0, languageLineEndingLength - loc.length));
        
        return (
          <div key={language} style={{ marginBottom: '0.5rem' }}>
            <span className="label">{label}</span>
            <span className="spacing">{spacing1}</span>
            <span className="value">{language}</span>
            <span className="spacing">{spacing2}</span>
            <span className="value2">{bytes}</span>
            <span className="spacing">{spacing3}</span>
            <span className="value">{loc}</span>
          </div>
        );
          })}
        </div>
        <div className="stats-table">
          {Object.entries(data).slice(6, 12).map(([language, stats], index) => {
            const label = `#${index + 7}`;
            const bytes = `${stats.bytes.toLocaleString()} bytes`;
            const loc = `${stats.estimatedLoC.toLocaleString()} lines`;
            const spacing1 = '·'.repeat(4 - label.length);
            const spacing2 = '·'.repeat(Math.max(
              0,
              languageLineLength - (label.length + language.length + (4 - label.length)) - bytes.length - languageLineEndingLength,
            ));
            const spacing3 = '·'.repeat(Math.max(0, languageLineEndingLength - loc.length));
            
            return (
              <div key={language} style={{ marginBottom: '0.5rem' }}>
                <span className="label">{label}</span>
                <span className="spacing">{spacing1}</span>
                <span className="value">{language}</span>
                <span className="spacing">{spacing2}</span>
                <span className="value2">{bytes}</span>
                <span className="spacing">{spacing3}</span>
                <span className="value">{loc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </>);
}

export default App
