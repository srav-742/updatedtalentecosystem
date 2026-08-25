import React, { useState } from 'react';
import AIInterviewFast from './AIInterviewFast';
import PracticeSandbox from './PracticeSandbox';

const InterviewWrapper = (props) => {
    const [isSandboxComplete, setIsSandboxComplete] = useState(false);

    if (!isSandboxComplete) {
        return (
            <div className="flex flex-col flex-1 items-center justify-center p-4 min-h-[60vh]">
                <PracticeSandbox onComplete={() => setIsSandboxComplete(true)} />
            </div>
        );
    }

    // Render the original AI Interview component with exactly the same props
    return <AIInterviewFast {...props} />;
};

export default InterviewWrapper;
