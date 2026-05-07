import { Helmet } from "react-helmet-async";

export default function AutomatedHiring() {
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <Helmet>
        <title>Automated Hiring Solutions | Hire1Percent</title>
        <meta
          name="description"
          content="Automate your hiring process from end-to-end with Hire1Percent. Reduce time-to-hire and improve candidate experience."
        />
        <meta name="keywords" content="automated hiring, recruitment automation, AI hiring, screening automation" />
      </Helmet>

      <h1>Automated Hiring</h1>

      <p>
        Automate your hiring funnel with Hire1Percent's AI tools, from 
        initial candidate sourcing to final assessment. Our end-to-end 
        recruitment automation platform ensures you never miss a top candidate.
      </p>

      <h2>Benefits of Automated Hiring</h2>

      <ul>
        <li>Drastically reduced time-to-hire by automating repetitive tasks</li>
        <li>Eliminated human bias for more equitable hiring outcomes</li>
        <li>Consistent evaluation criteria across all candidates</li>
        <li>Scalable recruitment processes that grow with your company</li>
      </ul>

      <h2>Why Choose Hire1Percent for Automation?</h2>

      <p>
        We go beyond simple automation. Our intelligent platform understands 
        the nuances of candidate profiles and provides actionable insights 
        that help you build high-performing teams faster than ever before.
      </p>

      <h2>Frequently Asked Questions</h2>

      <h3>What is automated hiring?</h3>
      <p>
        Automated hiring is the use of technology to perform recruitment tasks 
        such as screening resumes, scheduling interviews, and assessing 
        candidate skills without manual intervention.
      </p>

      <h3>Will automation replace recruiters?</h3>
      <p>
        No, automation is designed to augment recruiters by handling 
        time-consuming tasks, allowing them to focus on high-value human 
        interactions and strategic decision-making.
      </p>

      <h3>How secure is the candidate data?</h3>
      <p>
        We prioritize data privacy and security, ensuring all candidate 
        information is handled with industry-standard encryption and 
        compliance.
      </p>

    </div>
  );
}
