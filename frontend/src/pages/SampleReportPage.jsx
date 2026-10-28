import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './SampleReportPage.css';

const SampleReportPage = () => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="sample-report-page-root">
            <SEO 
                title="Hire1Percent — Sample Candidate Assessment Report"
                description="Sample candidate evaluation report showing coding correctness, AST code evolution, live adaptation, 3-minute video defense, and 4-layer authorship signals."
                canonicalUrl="/sample-report"
            />
            
            <main className="page">
                {/* Actions Bar */}
                <div className="actions">
                    <Link to="/" className="btn-back">
                        ← Back to Homepage
                    </Link>
                    <div className="actions-group">
                        <Link to="/?book-demo=true" className="btn-demo">
                            Book a 15-minute demo <span>↗</span>
                        </Link>
                        <button onClick={handlePrint} className="btn-primary" type="button">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                            Print / Save as PDF
                        </button>
                    </div>
                </div>

                {/* Top Header Card */}
                <header className="top">
                    <div>
                        <Link to="/" className="brand" aria-label="Hire1Percent Homepage">
                            Hire<span>1</span>Percent
                        </Link>
                        <div className="eyebrow">Candidate assessment report</div>
                        <h1>Software Engineer — Sample Report</h1>
                    </div>
                    <div className="meta">
                        Report ID: H1P-SAMPLE-024<br />
                        Generated: 27 Oct 2026<br />
                        Assessment type: Coding + structured review
                    </div>
                </header>

                {/* Body Content */}
                <div className="body">
                    {/* Intro Section */}
                    <section className="intro">
                        <div>
                            <h2>Candidate A</h2>
                            <p className="muted">Role: Software Engineer • Level: Mid-level</p>
                            <span className="pill">Assessment completed</span>
                        </div>
                        <div className="score">
                            <strong>82<span style={{ fontSize: '17px' }}>/100</span></strong>
                            <small>Overall assessment</small>
                        </div>
                    </section>

                    {/* Metric Grid */}
                    <div className="grid">
                        <div className="metric">
                            <label>Coding correctness</label>
                            <strong>86%</strong>
                        </div>
                        <div className="metric">
                            <label>Test coverage</label>
                            <strong>8 / 10</strong>
                        </div>
                        <div className="metric">
                            <label>Problem-solving</label>
                            <strong>Strong</strong>
                        </div>
                        <div className="metric">
                            <label>Code quality</label>
                            <strong>Good</strong>
                        </div>
                        <div className="metric">
                            <label>Live adaptation</label>
                            <strong>78 / 100</strong>
                        </div>
                        <div className="metric">
                            <label>Authorship evidence</label>
                            <strong>Consistent</strong>
                        </div>
                    </div>

                    {/* Competency Breakdown */}
                    <section className="section">
                        <h3>Competency breakdown</h3>
                        <div className="skill">
                            <span>Problem solving</span>
                            <div className="track">
                                <div className="fill" style={{ width: '88%' }}></div>
                            </div>
                            <b>88</b>
                        </div>
                        <div className="skill">
                            <span>Implementation</span>
                            <div className="track">
                                <div className="fill" style={{ width: '86%' }}></div>
                            </div>
                            <b>86</b>
                        </div>
                        <div className="skill">
                            <span>Code clarity</span>
                            <div className="track">
                                <div className="fill" style={{ width: '80%' }}></div>
                            </div>
                            <b>80</b>
                        </div>
                        <div className="skill">
                            <span>Edge cases</span>
                            <div className="track">
                                <div className="fill" style={{ width: '74%' }}></div>
                            </div>
                            <b>74</b>
                        </div>
                        <div className="skill">
                            <span>Explanation</span>
                            <div className="track">
                                <div className="fill" style={{ width: '82%' }}></div>
                            </div>
                            <b>82</b>
                        </div>
                    </section>

                    {/* Evidence Summary Table */}
                    <section className="section">
                        <h3>Evidence summary</h3>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Area</th>
                                        <th>Observation</th>
                                        <th>Signal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Task completion</td>
                                        <td>Core requirements implemented; most test cases passed.</td>
                                        <td className="status good">Strong</td>
                                    </tr>
                                    <tr>
                                        <td>Code evolution</td>
                                        <td>Changes were incremental and aligned with test feedback.</td>
                                        <td className="status good">Positive</td>
                                    </tr>
                                    <tr>
                                        <td>Live adaptation</td>
                                        <td>Responded to 14MB memory constraint with streaming generator pattern.</td>
                                        <td className="status good">Positive</td>
                                    </tr>
                                    <tr>
                                        <td>Revision integrity</td>
                                        <td>Immutable sequence verified (4 revisions, monotonic hashes, zero tampering).</td>
                                        <td className="status good">Verified</td>
                                    </tr>
                                    <tr>
                                        <td>AI code change analysis</td>
                                        <td>Gemini verified algorithm adaptation relevant to clamped memory constraint.</td>
                                        <td className="status good">Consistent</td>
                                    </tr>
                                    <tr>
                                        <td>Edge-case handling</td>
                                        <td>One boundary condition would benefit from additional validation.</td>
                                        <td className="status watch">Review</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Strengths & Follow-up Areas */}
                    <section className="section two">
                        <div className="panel">
                            <h4>Strengths</h4>
                            <ul>
                                <li>Clear decomposition of the problem.</li>
                                <li>Readable implementation with sensible naming.</li>
                                <li>Explained key trade-offs and complexity.</li>
                            </ul>
                        </div>
                        <div className="panel">
                            <h4>Follow-up areas</h4>
                            <ul>
                                <li>Probe boundary conditions and invalid inputs.</li>
                                <li>Ask for a brief discussion of alternative approaches.</li>
                                <li>Validate role-specific system design expectations.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Suggested Interviewer Focus */}
                    <section className="section">
                        <h3>Suggested interviewer focus</h3>
                        <p className="muted">
                            Use a short follow-up discussion to validate edge-case reasoning, trade-offs, and how the candidate would adapt the solution for production constraints.
                        </p>
                    </section>

                    {/* Sample Data Notice */}
                    <div className="note">
                        <strong>Sample data notice:</strong> This is a fictional demonstration report for layout and product preview purposes. Scores and observations are illustrative only and are not a real candidate evaluation. Hiring decisions should consider role requirements, structured interviews, and human review.
                    </div>
                </div>

                {/* Report Footer */}
                <footer className="foot">
                    <span>Hire1Percent • Coding assessments • Basic assessments • AI interviews</span>
                    <span>Confidential sample • Not for hiring decisions</span>
                </footer>
            </main>
        </div>
    );
};

export default SampleReportPage;
