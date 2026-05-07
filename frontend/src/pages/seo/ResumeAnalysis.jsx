import { Helmet } from "react-helmet-async";

export default function ResumeAnalysis() {
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <Helmet>
        <title>AI Resume Analysis & Parsing | Hire1Percent</title>
        <meta
          name="description"
          content="Extract deep insights from resumes using our state-of-the-art AI parsing and analysis engine. Match skills and experience accurately."
        />
        <meta name="keywords" content="resume analysis, AI resume parsing, skill matching, experience verification" />
      </Helmet>

      <h1>Resume Analysis</h1>

      <p>
        Extract deep insights from resumes using our state-of-the-art AI 
        parsing and analysis engine. Hire1Percent goes beyond simple 
        keyword matching to understand the context and depth of a 
        candidate's experience.
      </p>

      <h2>Key Capabilities of AI Resume Analysis</h2>

      <ul>
        <li>Semantic skill matching (understanding related skills and experience)</li>
        <li>Experience verification and career progression analysis</li>
        <li>Education background check and credential validation</li>
        <li>Gap analysis and candidate potential prediction</li>
      </ul>

      <h2>Why Traditional Resume Parsing Isn't Enough</h2>

      <p>
        Simple parsers often miss high-quality candidates because they lack 
        the context to understand varied terminology. Our AI uses natural 
        language processing to grasp the true value of a candidate's history, 
        ensuring you never overlook a great fit.
      </p>

      <h2>Frequently Asked Questions</h2>

      <h3>What is semantic resume analysis?</h3>
      <p>
        Semantic analysis goes beyond keywords to understand the meaning 
        behind the text, identifying relevant skills even if they aren't 
        explicitly listed with the exact wording in the job description.
      </p>

      <h3>How many resumes can it analyze at once?</h3>
      <p>
        Our system can process and analyze thousands of resumes per minute, 
        providing instant feedback and ranking for your entire talent pool.
      </p>

      <h3>Does it support different resume formats?</h3>
      <p>
        Yes, our AI parsing engine supports PDF, Word documents, and text 
        formats, accurately extracting data regardless of the layout.
      </p>

    </div>
  );
}
