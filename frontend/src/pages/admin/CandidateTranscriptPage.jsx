import React,{useState,useEffect} from 'react';
import{useParams,useNavigate}from 'react-router-dom';
import axios from 'axios';
import{API_URL,getAuthHeaders}from '../../firebase';
import{motion}from 'framer-motion';
import{ArrowLeft,User,Mail,Phone,MapPin,CheckCircle,XCircle,Award,FileText,Code,MessageSquare,BarChart2,Printer,ExternalLink}from 'lucide-react';

const ScoreRing=({value,color='#3b82f6',size=80,max=100})=>{
  const r=28;const circ=2*Math.PI*r;const pct=(value||0)/max;
  return(<svg width={size} height={size} viewBox='0 0 80 80'>
    <circle cx='40' cy='40' r={r} fill='none' stroke='rgba(0,0,0,0.1)' strokeWidth='8'/>
    <circle cx='40' cy='40' r={r} fill='none' stroke={color} strokeWidth='8'
      strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
      strokeLinecap='round' transform='rotate(-90 40 40)'/>
    <text x='40' y='44' textAnchor='middle' fill='#111827' fontSize='13' fontWeight='900'>
      {value!=null?`${Math.round(value)}/${max}`:'-'}
    </text>
  </svg>);};

const Sec=({title,icon,children,grad='from-blue-500 to-purple-500'})=>(
  <div className='mb-8 relative z-10'>
    <div className={'flex items-center gap-3 mb-5 pb-3 border-b border-black/10'}>
      <div className={'p-2 rounded-xl bg-gradient-to-br text-white shadow-sm '+grad}>{icon}</div>
      <h2 className='text-lg font-black text-gray-900 uppercase tracking-wide'>{title}</h2>
    </div>{children}
  </div>);

const CandidateTranscriptPage=()=>{
  const{applicationId}=useParams();
  const navigate=useNavigate();
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  useEffect(()=>{
    const load=async()=>{
      try{const h=await getAuthHeaders();const r=await axios.get(API_URL+'/transcripts/'+applicationId,{headers:h});setData(r.data);}
      catch(e){setError(e.response?.data?.message||'Failed to load');}
      finally{setLoading(false);}};load();
  },[applicationId]);

  if(loading)return(<div className='min-h-screen bg-gray-100 flex items-center justify-center'><div className='text-center'><div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'/><p className='text-gray-900 font-bold text-lg'>Building Transcript...</p></div></div>);
  if(error||!data)return(<div className='min-h-screen bg-gray-100 flex items-center justify-center'><div className='text-center text-gray-900'><XCircle size={48} className='mx-auto mb-4 text-red-500'/><p className='font-bold text-xl mb-4'>{error||'No data'}</p><button onClick={()=>navigate('/admin')} className='px-6 py-3 bg-black/10 rounded-xl font-bold'>Back</button></div></div>);

  const{candidate,job,application,resume,assessment,interview,scores,generatedAt}=data;
  const dynResume=scores?.resumeMatch||0;
  const dynAssessment=assessment&&assessment.totalQuestions>0?Math.round((assessment.correctAnswers/assessment.totalQuestions)*30):(scores?.assessmentScore||0);
  const dynInterview=interview?.questions?.length>0?Math.round((interview.questions.reduce((s,q)=>s+(typeof q.marks==='number'?q.marks:0),0)/(interview.questions.length*10))*50):(scores?.interviewScore||0);
  const fs=dynResume+dynAssessment+dynInterview;
  const verdict=fs>=80?{l:'Strongly Recommended',c:'text-emerald-600',b:'bg-emerald-50 border-emerald-200'}
    :fs>=60?{l:'Recommended',c:'text-blue-600',b:'bg-blue-50 border-blue-200'}
    :fs>=40?{l:'Needs Review',c:'text-amber-600',b:'bg-amber-50 border-amber-200'}
    :{l:'Not Recommended',c:'text-red-600',b:'bg-red-50 border-red-200'};
  return(
    <div className='min-h-screen bg-gray-100 text-gray-900 relative overflow-hidden'>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            background-color: #f3f4f6 !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color: #111827 !important;
          }
          .min-h-screen { background-color: #f3f4f6 !important; min-height: auto !important; }
          .max-w-5xl { max-width: 100% !important; padding: 0 !important; margin: 0 auto !important; }
          
          /* Force colors and backgrounds for all elements */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }

          /* Preserve gradients and borders */
          .bg-gradient-to-br, .bg-gradient-to-r {
            background-image: inherit !important;
          }

          /* Ensure sections and cards don't break across pages */
          .mb-8, .mb-10, .rounded-3xl, .rounded-2xl, .p-8, .p-5, .p-4 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
          }

          /* Disable sticky headers during print */
          .sticky { position: relative !important; top: 0 !important; }

          /* Layout adjustments for A4 */
          .grid { display: grid !important; }
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }

          .watermark-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            pointer-events: none;
            z-index: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .watermark-text {
            font-size: 60px !important;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.05) !important;
            transform: rotate(-45deg);
            white-space: nowrap;
          }
        }
        @page {
          size: auto;
          margin: 15mm 10mm;
        }
      `}</style>
      
      {/* Watermark for screen and print */}
      <div className="watermark-container">
        <div className="watermark-text select-none">
          HIRE ONE PERCENT
        </div>
      </div>

      <div className='no-print sticky top-0 z-50 bg-gray-100/90 backdrop-blur border-b border-black/10 px-6 py-4 flex items-center justify-between relative'>
        <button onClick={()=>navigate('/admin')} className='flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-sm'><ArrowLeft size={18}/>Back to Admin</button>
        <button onClick={()=>window.print()} className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-md'><Printer size={15}/>Download PDF</button>
      </div>
      <div className='max-w-5xl mx-auto px-4 md:px-6 py-10 relative z-10'>
        <div className='mb-10 p-8 rounded-3xl bg-white border border-black/10 shadow-sm'>
          <div className='flex items-start justify-between flex-wrap gap-6'>
            <div><div className='text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2'>Hire1Percent - Candidate Evaluation Report</div>
              <h1 className='text-4xl font-black text-gray-900 mb-1'>{candidate.name}</h1>
              <p className='text-gray-600 font-medium text-lg'>{job.title}{job.company?' @ '+job.company:''}</p>
              <p className='text-gray-500 text-xs mt-2'>Generated: {new Date(generatedAt).toLocaleString()}</p></div>
            <div className={'px-8 py-5 rounded-2xl border text-center min-w-[140px] '+verdict.b}>
              <p className={'text-4xl font-black '+verdict.c}>{fs!=null?Math.round(fs):'--'}</p>
              <p className={'text-xs font-black uppercase tracking-widest mt-1 '+verdict.c}>Final Score</p>
              <p className={'text-[10px] font-bold mt-2 '+verdict.c}>{verdict.l}</p>
            </div>
          </div>
        </div>
        <Sec title='Candidate Profile' icon={<User size={16}/>} grad='from-blue-500 to-cyan-500'>
          <div className='grid md:grid-cols-2 gap-4'>
            <div className='space-y-3'>
              {candidate.email&&<div className='flex items-center gap-3'><Mail size={14} className='text-gray-500'/><span className='text-sm text-gray-700'>{candidate.email}</span></div>}
              {candidate.phone&&<div className='flex items-center gap-3'><Phone size={14} className='text-gray-500'/><span className='text-sm text-gray-700'>{candidate.phone}</span></div>}
              {candidate.location&&<div className='flex items-center gap-3'><MapPin size={14} className='text-gray-500'/><span className='text-sm text-gray-700'>{candidate.location}</span></div>}
              {candidate.linkedinUrl&&<a href={candidate.linkedinUrl} target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 text-blue-600 text-sm font-bold hover:underline'><ExternalLink size={14}/>LinkedIn</a>}
              {candidate.githubUrl&&<a href={candidate.githubUrl} target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 text-teal-600 text-sm font-bold hover:underline'><ExternalLink size={14}/>GitHub</a>}
            </div>
            <div className='p-5 rounded-2xl bg-white shadow-sm border border-black/5 space-y-2 text-sm'>
              <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>Application Info</p>
              <div className='flex justify-between'><span className='text-gray-500'>Applied</span><span className='font-bold text-gray-900'>{new Date(application.appliedAt).toLocaleDateString()}</span></div>
              <div className='flex justify-between'><span className='text-gray-500'>Status</span><span className='font-black text-emerald-600 uppercase'>{application.status}</span></div>
              <div className='flex justify-between'><span className='text-gray-500'>Role</span><span className='font-bold text-gray-900'>{job.title}</span></div>
            </div>
          </div>
        </Sec>
        {resume?.profile&&(
          <Sec title='Resume Summary' icon={<FileText size={16}/>} grad='from-teal-500 to-green-500'>
            {resume.profile.summary&&<p className='text-gray-700 text-sm leading-relaxed mb-5 p-4 rounded-2xl bg-white shadow-sm border border-black/5 italic'>{resume.profile.summary}</p>}
            {resume.profile.workExperience?.length>0&&(<div className='mb-5'><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Work Experience</p>
              <div className='space-y-3'>{resume.profile.workExperience.map((w,i)=>(<div key={i} className='p-4 rounded-2xl bg-white shadow-sm border border-black/5'>
                <div className='flex justify-between flex-wrap gap-2 mb-1'><div><p className='font-black text-gray-900 text-sm'>{w.position}</p><p className='text-gray-600 text-xs'>{w.company}</p></div><p className='text-gray-500 text-xs'>{w.startYear}-{w.currentlyWorking?'Present':w.endYear}</p></div>
                {w.description&&<p className='text-gray-600 text-xs mt-2 leading-relaxed'>{w.description}</p>}</div>))}</div></div>)}
            {resume.profile.education?.length>0&&(<div className='mb-5'><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Education</p>
              <div className='space-y-2'>{resume.profile.education.map((e,i)=>(<div key={i} className='p-4 rounded-2xl bg-white shadow-sm border border-black/5'>
                <p className='font-black text-gray-900 text-sm'>{e.degree} in {e.field}</p><p className='text-gray-600 text-xs'>{e.institution} - {e.startYear}-{e.currentlyStudying?'Present':e.endYear}</p></div>))}</div></div>)}
            {resume.profile.skills&&(<div className='mb-5'><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Skills</p>
              <div className='flex flex-wrap gap-1.5'>{[...(resume.profile.skills.programming||[]),...(resume.profile.skills.frameworks||[]),...(resume.profile.skills.databases||[]),...(resume.profile.skills.tools||[])].map((s,i)=>(<span key={i} className='px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-800'>{s}</span>))}</div></div>)}
            {resume.profile.projects?.length>0&&(<div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Projects</p>
              <div className='space-y-2'>{resume.profile.projects.map((p,i)=>(<div key={i} className='p-3 rounded-xl bg-white shadow-sm border border-black/5'>
                <p className='font-black text-sm text-gray-900'>{p.name}</p>{p.tech?.length>0&&<p className='text-xs text-gray-500'>{p.tech.join(', ')}</p>}</div>))}</div></div>)}
          </Sec>)}
        {resume?.analysis&&(
          <Sec title='Resume Evaluation' icon={<BarChart2 size={16}/>} grad='from-emerald-500 to-teal-500'>
            <div className='flex justify-center mb-6'>
              <div className='p-6 rounded-2xl bg-white shadow-sm border border-black/5 text-center flex flex-col items-center min-w-[240px]'>
                <ScoreRing value={scores?.resumeMatch} color='#3b82f6' size={100} max={20}/>
                <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-4'>Overall Resume Match</p>
              </div>
            </div>
            {resume.analysis.explanation&&<p className='text-gray-700 text-sm leading-relaxed p-4 rounded-2xl bg-white shadow-sm border border-black/5 mb-3'>{resume.analysis.explanation}</p>}
            {resume.analysis.skillsFeedback&&<p className='text-gray-700 text-xs p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-2'><span className='font-black text-emerald-600'>Skills: </span>{resume.analysis.skillsFeedback}</p>}
            {resume.analysis.experienceFeedback&&<p className='text-gray-700 text-xs p-3 rounded-xl bg-blue-50 border border-blue-200'><span className='font-black text-blue-600'>Experience: </span>{resume.analysis.experienceFeedback}</p>}
          </Sec>)}
        {assessment&&(
          <Sec title='Skill Assessment Transcript' icon={<Code size={16}/>} grad='from-orange-500 to-amber-500'>
            <div className='flex items-center gap-8 mb-6 p-5 rounded-2xl bg-orange-50 border border-orange-200'>
              <div className='text-center'><p className='text-4xl font-black text-orange-600'>{assessment.totalQuestions>0?`${Math.round((assessment.correctAnswers/assessment.totalQuestions)*30)}/30`:'N/A'}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Score</p></div>
              <div className='text-center'><p className='text-4xl font-black text-gray-900'>{assessment.correctAnswers}/{assessment.totalQuestions}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Correct</p></div>
            </div>
            <div className='space-y-4'>{assessment.answers.map((a,i)=>(<div key={i} className={'p-4 rounded-2xl border bg-white shadow-sm '+(a.isCorrect?'border-emerald-200':'border-red-200')}>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>{a.isCorrect?<CheckCircle size={15} className='text-emerald-500'/>:<XCircle size={15} className='text-red-500'/>}<span className='text-[10px] font-black uppercase tracking-widest text-gray-500'>Q{i+1} - {a.skill} - {a.questionType?.toUpperCase()}</span></div>
                <span className={'text-xs font-black '+(a.isCorrect?'text-emerald-600':'text-red-600')}>{a.isCorrect?'Correct':'Incorrect'}</span>
              </div>
              <p className='text-sm font-bold text-gray-900 mb-2'>{a.question}</p>
              <div className='grid md:grid-cols-2 gap-2 text-xs'>
                <div className='p-2 rounded-lg bg-gray-50 border border-gray-100'><span className='font-black text-gray-600'>Your Answer: </span><span className='text-gray-800'>{String(a.userAnswer||'--')}</span></div>
                <div className='p-2 rounded-lg bg-gray-50 border border-gray-100'><span className='font-black text-gray-600'>Correct: </span><span className='font-bold text-emerald-600'>{String(a.correctAnswer||'--')}</span></div>
              </div></div>))}</div>
          </Sec>)}
        {interview?.questions?.length>0&&(
          <Sec title='AI Interview Transcript' icon={<MessageSquare size={16}/>} grad='from-purple-500 to-indigo-500'>
            <div className='flex items-center gap-8 mb-6 p-5 rounded-2xl bg-purple-50 border border-purple-200'>
              <div className='text-center'><p className='text-4xl font-black text-purple-600'>{interview.questions.length>0?`${Math.round((interview.questions.reduce((s,q)=>s+(typeof q.marks==='number'?q.marks:0),0)/(interview.questions.length*10))*50)}/50`:'N/A'}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Score</p></div>
              <div className='text-center'><p className='text-4xl font-black text-gray-900'>{interview.totalQuestions}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Questions</p></div>
            </div>
            <div className='space-y-5'>{interview.questions.map((q,i)=>(<motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className='rounded-2xl border border-purple-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between px-5 py-3 bg-purple-50 border-b border-purple-100'>
                <div className='flex items-center gap-3'><div className='w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-black text-sm'>{q.questionNumber}</div><span className='text-[10px] font-black uppercase tracking-widest text-purple-700'>Question {q.questionNumber}</span></div>
                <div className='flex items-center gap-2'><span className='text-sm font-black text-gray-900'>{typeof q.marks==='number'?q.marks.toFixed(1):0}/10</span><span className='text-[10px] text-purple-600'>({q.score||0}%)</span></div>
              </div>
              <div className='p-5 space-y-4'>
                <div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>AI Question</p><p className='text-sm font-bold text-gray-900 p-3 rounded-xl bg-gray-50 border border-black/5'>{q.question}</p></div>
                {q.isAttempted?<div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>Candidate Answer</p><p className='text-sm text-gray-800 p-3 rounded-xl bg-indigo-50 border border-indigo-100 leading-relaxed'>{q.answer}</p></div>:<p className='text-xs text-red-500 font-bold italic'>Not attempted</p>}
                {q.feedback&&<div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>Reason for Assessment</p><p className='text-xs text-gray-700 p-3 rounded-xl bg-emerald-50 border border-emerald-100 leading-relaxed'>{q.feedback}</p></div>}
              </div></motion.div>))}</div>
          </Sec>)}
        <Sec title='Overall Evaluation Summary' icon={<Award size={16}/>} grad='from-yellow-500 to-orange-500'>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-6'>
            {[{l:'Resume Match',v:dynResume,c:'#3b82f6',m:20},{l:'Assessment',v:dynAssessment,c:'#f97316',m:30},{l:'Interview',v:dynInterview,c:'#8b5cf6',m:50},{l:'Final Score',v:fs,c:'#f59e0b',m:100}].map((s,i)=>(<div key={i} className='p-4 rounded-2xl bg-white shadow-sm border border-black/5 flex flex-col items-center'><ScoreRing value={s.v} color={s.c} size={80} max={s.m}/><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2'>{s.l}</p></div>))}
          </div>
          <div className={'flex items-center justify-between p-6 rounded-3xl border shadow-sm '+verdict.b}>
            <div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1'>Hire Recommendation</p><p className={'text-3xl font-black '+verdict.c}>{verdict.l}</p></div>
            <div className='text-right'><p className={'text-5xl font-black '+verdict.c}>{fs!=null?Math.round(fs):'--'}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500'>Overall Score</p></div>
          </div>
        </Sec>
      </div>
    </div>);};
export default CandidateTranscriptPage;