import ascii from './util/ascii';
import './App.css'
import data from './assets/data_ranked.json';
import { mainLines, mainLinesValueColors } from './util/mainLines';
import { communityLines } from './util/communityLines';

const lineLength = 65;
const languageLineLength = 56;
const languageLineEndingLength = 15;

const spacify = (str: string, { left = true, right = true } = {}): string=> {
  if (str.length === 1) {
    return '\u00A0';
  } else {
    const leftSlice = left ? 1 : 0;
    const rightSlice = right ? -1 : str.length;
    return (left ? '\u00A0' : '') + str.slice(leftSlice, rightSlice) + (right ? '\u00A0' : '');
  }
}

function App() {
  return (<>
    <div className="app-container">
      <div className="container">
        <pre>{ascii}</pre>
      </div>
      <div className="info">
        {mainLines.map((line, index) => {
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
          spacing = spacify(spacing);

          return (
            <div className={right ? '' : 'header-row'} key={index}>
              {right ? '\u00A0'.repeat(2) : ''}
              <span className={right ? 'label' : 'header'}>{left}</span>
              {right ? (
                <>
                  <span className="spacing">{spacing}</span>
                  <span className={mainLinesValueColors[index] === 0 ? 'value' : 'value2'}>{right}</span>
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
        <div className="header-line hl1" />
        <span className="header">community (see below for links)</span>
        <div className="header-line hl2" />
      </div>
      <div className="stats-container" style={{ display: 'flex', gap: '2rem' }}>
        <div className="stats-table">
          {Object.entries(data).slice(0, 5).map(([language, stats], index) => {
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
                <span className="spacing">{spacify(spacing1)}</span>
                <span className="value">{language}</span>
                <span className="spacing">{spacify(spacing2)}</span>
                <span className="value2">{bytes}</span>
                <span className="spacing">{spacify(spacing3)}</span>
                <span className="value">{loc}</span>
              </div>
            );
          })}
        </div>
        <div className="community-efforts">
          {communityLines.map((line, index) => {
            // 56 total
            // 11 for role column
            // unknown for role column
            // 11 for company column
            const [company, project, role] = line;

            const totalBudget = 56;
            const roleSpacingBudget = 14;

            const companyPostSpacing = '·'.repeat(
              totalBudget - (company.length) - project.length - roleSpacingBudget
            );
            
            const projectPostSpacing = '·'.repeat(Math.max(0, roleSpacingBudget - 12));

            return (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                {company && (<>
                  <span className="value">{company}</span>
                </>)}
                <span className="spacing">{spacify(companyPostSpacing, {
                  right: !!project,
                })}</span>
                {project && (
                  <span className="value2">{project}</span>
                )}
                <span className="spacing">{spacify(projectPostSpacing, {
                  left: !!project,
                })}</span>
                <span className="label">{role}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </>);
}

export default App
