export const onboardingTemplates = {
    offer: {
        title: "Offer Letter",
        description: "Official employment offer including role, salary, and benefits.",
        fields: ["candidateName", "roleTitle", "salary", "startDate", "companyName", "managerName"],
        content: `
# EMPLOYMENT OFFER LETTER

**Date:** {{currentDate}}

**To:** {{candidateName}}

Dear {{candidateName}},

We are thrilled to offer you the position of **{{roleTitle}}** at **{{companyName}}**. We were very impressed with your skills and experience, and we believe you will be a valuable addition to our team.

### 1. POSITION AND DUTIES
You will be employed in the role of **{{roleTitle}}**. In this capacity, you will report directly to **{{managerName}}**. Your responsibilities will include the duties discussed during your interview process and any other duties as may be assigned from time to time.

### 2. COMPENSATION
Your starting annual gross salary will be **{{salary}}**, payable in accordance with the Company’s standard payroll schedule.

### 3. START DATE
Your employment will commence on **{{startDate}}**.

### 4. AT-WILL EMPLOYMENT
Employment with {{companyName}} is "at-will," meaning that either you or the Company may terminate the employment relationship at any time, with or without cause, and with or without notice.

We look forward to having you join us!

Sincerely,

**{{managerName}}**
{{companyName}}
        `
    },
    nda: {
        title: "Non-Disclosure Agreement",
        description: "Standard confidentiality agreement to protect company secrets.",
        fields: ["candidateName", "companyName", "effectiveDate"],
        content: `
# NON-DISCLOSURE AGREEMENT (NDA)

This Non-Disclosure Agreement (the "Agreement") is entered into as of **{{effectiveDate}}**, by and between **{{companyName}}** (the "Company") and **{{candidateName}}** (the "Recipient").

### 1. DEFINITION OF CONFIDENTIAL INFORMATION
Confidential Information includes any data or information that is proprietary to the Company and not generally known to the public, including but not limited to business plans, customer lists, trade secrets, and technical data.

### 2. OBLIGATIONS OF RECIPIENT
The Recipient agrees to hold the Confidential Information in strict confidence and to take all reasonable precautions to protect such Confidential Information. The Recipient shall not disclose any Confidential Information to third parties without the prior written consent of the Company.

### 3. TERM
The obligations of this Agreement shall survive for a period of 5 years from the date of disclosure.

**Signed:**

__________________________
**{{candidateName}}**
        `
    },
    ip: {
        title: "IP Assignment Agreement",
        description: "Ensures all work created during employment belongs to the company.",
        fields: ["candidateName", "companyName"],
        content: `
# INTELLECTUAL PROPERTY ASSIGNMENT

I, **{{candidateName}}**, in consideration of my employment with **{{companyName}}**, hereby agree as follows:

### 1. OWNERSHIP OF WORK PRODUCT
I agree that all inventions, improvements, software, designs, and other work product ("Work Product") created by me during the period of my employment that relate to the Company's business shall be the sole and exclusive property of {{companyName}}.

### 2. ASSIGNMENT
I hereby irrevocably assign and transfer to the Company all right, title, and interest in and to any and all Work Product.

### 3. ASSISTANCE
I agree to assist the Company, at its expense, to secure and protect the Company’s rights in the Work Product, including the execution of all papers deemed necessary by the Company.

**Signed:**

__________________________
**{{candidateName}}**
        `
    },
    goals: {
        title: "30-60-90 Day Plan",
        description: "Strategic milestone framework for the new hire's first 3 months.",
        fields: ["candidateName", "roleTitle", "companyName"],
        content: `
# 30-60-90 DAY GOAL FRAMEWORK

**Prepared for:** {{candidateName}}
**Role:** {{roleTitle}}

### PHASE 1: DAY 1 - 30 (LEARNING)
*   **Onboarding:** Complete all internal training and tool setups.
*   **Understanding:** Meet with all key stakeholders and understand workflows.
*   **Initial Tasks:** Successfully complete the first minor project or task batch.

### PHASE 2: DAY 31 - 60 (CONTRIBUTING)
*   **Ownership:** Take full ownership of a specific sub-module or process.
*   **Optimization:** Identify one area for process improvement and propose a solution.
*   **Collaboration:** Actively participate in all team meetings and provide technical input.

### PHASE 3: DAY 61 - 90 (INNOVATING)
*   **Impact:** Deliver a significant project or feature independently.
*   **Independence:** Operate with minimal supervision on core responsibilities.
*   **Strategic Input:** Help define goals for the next quarter.

**Success Metrics:**
1. Quality of code/deliverables.
2. Integration into the team culture.
3. Feedback from manager.
        `
    }
};
