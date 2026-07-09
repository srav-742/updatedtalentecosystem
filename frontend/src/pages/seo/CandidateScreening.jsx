import { Helmet } from "react-helmet-async";

export default function CandidateScreening() {
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <Helmet>
        <title>AI Candidate Screening | Hire1Percent</title>
        <meta
          name="description"
          content="Efficiently screen thousands of candidates with our AI-driven assessment platform. Identify top talent quickly and accurately."
        />
        <meta name="keywords" content="candidate screening, AI screening, resume filtering, talent assessment" />
      </Helmet>

      <h1>Candidate Screening</h1>

      <p>
        Efficiently screen thousands of candidates with our AI-driven 
        assessment platform. Hire1Percent uses advanced algorithms to 
        identify the perfect match for your job requirements in minutes.
      </p>

      <h2>How AI Candidate Screening Works</h2>

      <ul>
        <li>Skill-based testing and evaluation</li>
        <li>Behavioral analysis and soft-skill assessment</li>
        <li>AI scoring engine for objective candidate ranking</li>
        <li>Creation of detailed candidate profiles with performance data</li>
      </ul>

      <h2>Why Automated Screening is Essential</h2>

      <p>
        In today's competitive market, speed is everything. Automated 
        screening allows you to reach top candidates before your competitors, 
        while maintaining a high bar for quality and cultural fit.
      </p>

      <h2>Frequently Asked Questions</h2>

      <h3>How does AI filter candidates?</h3>
      <p>
        The AI analyzes resume content, assessment results, and interview 
        data to match candidate profiles against your specific job 
        requirements and company benchmarks.
      </p>

      <h3>Can it handle large volumes of applications?</h3>
      <p>
        Yes, our platform is built to handle tens of thousands of 
        applications simultaneously, providing consistent screening speed 
        regardless of volume.
      </p>

      <h3>Is the screening process customizable?</h3>
      <p>
        Absolutely. You can define custom skill tests, behavioral questions, 
        and weighting for different criteria to match your unique hiring needs.
      </p>

    </div>
  );
}
