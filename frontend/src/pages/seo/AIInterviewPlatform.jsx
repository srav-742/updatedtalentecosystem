import { Helmet } from "react-helmet-async";

export default function AIInterviewPlatform() {
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <Helmet>
        <title>AI Interview Platform | Hire1Percent</title>
        <meta
          name="description"
          content="Scale your hiring with our AI interview platform. Automated candidate screening and recruitment workflows for modern teams."
        />
        <meta name="keywords" content="AI interview platform, automated interviews, candidate screening, AI hiring" />
      </Helmet>

      <h1>AI Interview Platform</h1>

      <p>
        Hire1Percent provides an industry-leading AI interview platform for 
        automated candidate screening and recruitment workflows. Conduct 
        interviews at scale without increasing your team's workload.
      </p>

      <h2>Key Features</h2>

      <ul>
        <li>Asynchronous AI-led interviews</li>
        <li>Real-time candidate scoring and feedback</li>
        <li>Automated screening based on custom job criteria</li>
        <li>Detailed resume and performance analysis</li>
        <li>Secure and unbiased evaluation engine</li>
      </ul>

      <h2>Why Use an AI Interview Platform?</h2>

      <p>
        Traditional interviewing is time-consuming and often prone to bias. 
        Hire1Percent's AI interview platform ensures that every candidate is 
        evaluated fairly and consistently, providing recruiters with reliable 
        data to make informed hiring decisions.
      </p>

      <h2>Frequently Asked Questions</h2>

      <h3>What is an AI interview?</h3>
      <p>
        An AI interview is a process where an artificial intelligence agent 
        asks questions to a candidate and analyzes their responses to assess 
        technical skills, behavioral traits, and job fit.
      </p>

      <h3>How accurate is the AI scoring?</h3>
      <p>
        Our AI models are trained on millions of data points to provide 
        highly accurate scoring that matches human recruiter standards.
      </p>

      <h3>Is the platform accessible for candidates?</h3>
      <p>
        Yes, candidates can take interviews from any device with a camera 
        and internet connection, making the process flexible and convenient.
      </p>

    </div>
  );
}