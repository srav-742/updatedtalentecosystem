import React,{useState,useEffect} from 'react';
import{useParams,useNavigate}from 'react-router-dom';
import axios from 'axios';
import{API_URL,getAuthHeaders}from '../../firebase';
import{motion}from 'framer-motion';
import{ArrowLeft,User,Mail,Phone,MapPin,CheckCircle,XCircle,Award,FileText,Code,MessageSquare,BarChart2,Printer,ExternalLink}from 'lucide-react';

const ScoreRing=({value,color='#3b82f6',size=80,max=100})=>{
  const r=28;const circ=2*Math.PI*r;const pct=(value||0)/max;
  return(<svg width={size} height={size} viewBox='0 0 80 80'>
    <circle cx='40' cy='40' r={r} fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth='8'/>
    <circle cx='40' cy='40' r={r} fill='none' stroke={color} strokeWidth='8'
      strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
      strokeLinecap='round' transform='rotate(-90 40 40)'/>
    <text x='40' y='44' textAnchor='middle' fill='white' fontSize='13' fontWeight='900'>
      {value!=null?`${Math.round(value)}/${max}`:'-'}
    </text>
  </svg>);};

const Sec=({title,icon,children,grad='from-blue-500 to-purple-500'})=>(
  <div className='mb-8'>
    <div className={'flex items-center gap-3 mb-5 pb-3 border-b border-white/10'}>
      <div className={'p-2 rounded-xl bg-gradient-to-br text-white '+grad}>{icon}</div>
      <h2 className='text-lg font-black text-white uppercase tracking-wide'>{title}</h2>
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

  if(loading)return(<div className='min-h-screen bg-[#0c0f16] flex items-center justify-center'><div className='text-center'><div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'/><p className='text-white font-bold text-lg'>Building Transcript...</p></div></div>);
  if(error||!data)return(<div className='min-h-screen bg-[#0c0f16] flex items-center justify-center'><div className='text-center text-white'><XCircle size={48} className='mx-auto mb-4 text-red-400'/><p className='font-bold text-xl mb-4'>{error||'No data'}</p><button onClick={()=>navigate('/admin')} className='px-6 py-3 bg-white/10 rounded-xl font-bold'>Back</button></div></div>);

  const{candidate,job,application,resume,assessment,interview,scores,generatedAt}=data;
  const fs=scores.finalScore;
  const verdict=fs>=80?{l:'Strongly Recommended',c:'text-emerald-400',b:'bg-emerald-500/20 border-emerald-500/30'}
    :fs>=60?{l:'Recommended',c:'text-blue-400',b:'bg-blue-500/20 border-blue-500/30'}
    :fs>=40?{l:'Needs Review',c:'text-amber-400',b:'bg-amber-500/20 border-amber-500/30'}
    :{l:'Not Recommended',c:'text-red-400',b:'bg-red-500/20 border-red-500/30'};
  return(
    <div className='min-h-screen bg-[#0c0f16] text-white'>
      <style>{'@media print{.no-print{display:none!important;}'}</style>
      <div className='no-print sticky top-0 z-50 bg-[#0c0f16]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between'>
        <button onClick={()=>navigate('/admin')} className='flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm'><ArrowLeft size={18}/>Back to Admin</button>
        <button onClick={()=>window.print()} className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform'><Printer size={15}/>Download PDF</button>
      </div>
      <div className='max-w-5xl mx-auto px-4 md:px-6 py-10'>
        <div className='mb-10 p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-600/20 border border-white/10'>
          <div className='flex items-start justify-between flex-wrap gap-6'>
            <div><div className='text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2'>Hire1Percent - Candidate Evaluation Report</div>
              <h1 className='text-4xl font-black text-white mb-1'>{candidate.name}</h1>
              <p className='text-gray-400 font-medium text-lg'>{job.title}{job.company?' @ '+job.company:''}</p>
              <p className='text-gray-600 text-xs mt-2'>Generated: {new Date(generatedAt).toLocaleString()}</p></div>
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
              {candidate.email&&<div className='flex items-center gap-3'><Mail size={14} className='text-gray-400'/><span className='text-sm text-gray-300'>{candidate.email}</span></div>}
              {candidate.phone&&<div className='flex items-center gap-3'><Phone size={14} className='text-gray-400'/><span className='text-sm text-gray-300'>{candidate.phone}</span></div>}
              {candidate.location&&<div className='flex items-center gap-3'><MapPin size={14} className='text-gray-400'/><span className='text-sm text-gray-300'>{candidate.location}</span></div>}
              {candidate.linkedinUrl&&<a href={candidate.linkedinUrl} target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 text-blue-400 text-sm font-bold hover:underline'><ExternalLink size={14}/>LinkedIn</a>}
              {candidate.githubUrl&&<a href={candidate.githubUrl} target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 text-teal-400 text-sm font-bold hover:underline'><ExternalLink size={14}/>GitHub</a>}
            </div>
            <div className='p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-sm'>
              <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>Application Info</p>
              <div className='flex justify-between'><span className='text-gray-500'>Applied</span><span className='font-bold'>{new Date(application.appliedAt).toLocaleDateString()}</span></div>
              <div className='flex justify-between'><span className='text-gray-500'>Status</span><span className='font-black text-emerald-400 uppercase'>{application.status}</span></div>
              <div className='flex justify-between'><span className='text-gray-500'>Role</span><span className='font-bold'>{job.title}</span></div>
            </div>
          </div>
        </Sec>
        {resume?.profile&&(
          <Sec title='Resume Summary' icon={<FileText size={16}/>} grad='from-teal-500 to-green-500'>
            {resume.profile.summary&&<p className='text-gray-300 text-sm leading-relaxed mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 italic'>{resume.profile.summary}</p>}
            {resume.profile.workExperience?.length>0&&(<div className='mb-5'><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Work Experience</p>
              <div className='space-y-3'>{resume.profile.workExperience.map((w,i)=>(<div key={i} className='p-4 rounded-2xl bg-white/5 border border-white/10'>
                <div className='flex justify-between flex-wrap gap-2 mb-1'><div><p className='font-black text-white text-sm'>{w.position}</p><p className='text-gray-400 text-xs'>{w.company}</p></div><p className='text-gray-600 text-xs'>{w.startYear}-{w.currentlyWorking?'Present':w.endYear}</p></div>
                {w.description&&<p className='text-gray-400 text-xs mt-2 leading-relaxed'>{w.description}</p>}</div>))}</div></div>)}
            {resume.profile.education?.length>0&&(<div className='mb-5'><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Education</p>
              <div className='space-y-2'>{resume.profile.education.map((e,i)=>(<div key={i} className='p-4 rounded-2xl bg-white/5 border border-white/10'>
                <p className='font-black text-white text-sm'>{e.degree} in {e.field}</p><p className='text-gray-400 text-xs'>{e.institution} - {e.startYear}-{e.currentlyStudying?'Present':e.endYear}</p></div>))}</div></div>)}
            {resume.profile.skills&&(<div className='mb-5'><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Skills</p>
              <div className='flex flex-wrap gap-1.5'>{[...(resume.profile.skills.programming||[]),...(resume.profile.skills.frameworks||[]),...(resume.profile.skills.databases||[]),...(resume.profile.skills.tools||[])].map((s,i)=>(<span key={i} className='px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300'>{s}</span>))}</div></div>)}
            {resume.profile.projects?.length>0&&(<div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3'>Projects</p>
              <div className='space-y-2'>{resume.profile.projects.map((p,i)=>(<div key={i} className='p-3 rounded-xl bg-white/5 border border-white/10'>
                <p className='font-black text-sm text-white'>{p.name}</p>{p.tech?.length>0&&<p className='text-xs text-gray-500'>{p.tech.join(', ')}</p>}</div>))}</div></div>)}
          </Sec>)}
        {resume?.analysis&&(
          <Sec title='Resume Evaluation' icon={<BarChart2 size={16}/>} grad='from-emerald-500 to-teal-500'>
            <div className='grid grid-cols-3 gap-4 mb-6'>
              {[{l:'Resume Match',v:resume.analysis.matchPercentage,c:'#3b82f6',m:20},{l:'Skills Score',v:resume.analysis.skillsScore,c:'#10b981',m:20},{l:'Experience',v:resume.analysis.experienceScore,c:'#8b5cf6',m:20}].map((s,i)=>(<div key={i} className='p-5 rounded-2xl bg-white/5 border border-white/10 text-center'><ScoreRing value={s.v} color={s.c} max={s.m}/><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2'>{s.l}</p></div>))}
            </div>
            {resume.analysis.explanation&&<p className='text-gray-300 text-sm leading-relaxed p-4 rounded-2xl bg-white/5 border border-white/10 mb-3'>{resume.analysis.explanation}</p>}
            {resume.analysis.skillsFeedback&&<p className='text-gray-400 text-xs p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mb-2'><span className='font-black text-emerald-400'>Skills: </span>{resume.analysis.skillsFeedback}</p>}
            {resume.analysis.experienceFeedback&&<p className='text-gray-400 text-xs p-3 rounded-xl bg-blue-500/5 border border-blue-500/15'><span className='font-black text-blue-400'>Experience: </span>{resume.analysis.experienceFeedback}</p>}
          </Sec>)}
        {assessment&&(
          <Sec title='Skill Assessment Transcript' icon={<Code size={16}/>} grad='from-orange-500 to-amber-500'>
            <div className='flex items-center gap-8 mb-6 p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20'>
              <div className='text-center'><p className='text-4xl font-black text-orange-400'>{assessment.score!=null?`${Math.round(assessment.score)}/30`:'N/A'}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Score</p></div>
              <div className='text-center'><p className='text-4xl font-black text-white'>{assessment.correctAnswers}/{assessment.totalQuestions}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Correct</p></div>
            </div>
            <div className='space-y-4'>{assessment.answers.map((a,i)=>(<div key={i} className={'p-4 rounded-2xl border '+(a.isCorrect?'border-emerald-500/20 bg-emerald-500/5':'border-red-500/20 bg-red-500/5')}>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>{a.isCorrect?<CheckCircle size={15} className='text-emerald-400'/>:<XCircle size={15} className='text-red-400'/>}<span className='text-[10px] font-black uppercase tracking-widest text-gray-500'>Q{i+1} - {a.skill} - {a.questionType?.toUpperCase()}</span></div>
                <span className={'text-xs font-black '+(a.isCorrect?'text-emerald-400':'text-red-400')}>{a.isCorrect?'Correct':'Incorrect'}</span>
              </div>
              <p className='text-sm font-bold text-white mb-2'>{a.question}</p>
              <div className='grid md:grid-cols-2 gap-2 text-xs'>
                <div className='p-2 rounded-lg bg-white/5'><span className='font-black text-gray-500'>Your Answer: </span><span className='text-gray-300'>{String(a.userAnswer||'--')}</span></div>
                <div className='p-2 rounded-lg bg-white/5'><span className='font-black text-gray-500'>Correct: </span><span className='font-bold text-emerald-400'>{String(a.correctAnswer||'--')}</span></div>
              </div></div>))}</div>
          </Sec>)}
        {interview?.questions?.length>0&&(
          <Sec title='AI Interview Transcript' icon={<MessageSquare size={16}/>} grad='from-purple-500 to-indigo-500'>
            <div className='flex items-center gap-8 mb-6 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20'>
              <div className='text-center'><p className='text-4xl font-black text-purple-400'>{interview.score!=null?`${Math.round(interview.score)}/50`:'N/A'}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Score</p></div>
              <div className='text-center'><p className='text-4xl font-black text-white'>{interview.totalQuestions}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1'>Questions</p></div>
            </div>
            <div className='space-y-5'>{interview.questions.map((q,i)=>(<motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className='rounded-2xl border border-purple-500/20 bg-purple-500/5 overflow-hidden'>
              <div className='flex items-center justify-between px-5 py-3 bg-purple-500/10 border-b border-purple-500/20'>
                <div className='flex items-center gap-3'><div className='w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-black text-sm'>{q.questionNumber}</div><span className='text-[10px] font-black uppercase tracking-widest text-purple-300'>Question {q.questionNumber}</span></div>
                <div className='flex items-center gap-2'><span className='text-sm font-black text-white'>{typeof q.marks==='number'?q.marks.toFixed(1):0}/10</span><span className='text-[10px] text-purple-400'>({q.score||0}%)</span></div>
              </div>
              <div className='p-5 space-y-4'>
                <div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>AI Question</p><p className='text-sm font-bold text-white p-3 rounded-xl bg-white/5 border border-white/10'>{q.question}</p></div>
                {q.isAttempted?<div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>Candidate Answer</p><p className='text-sm text-gray-300 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 leading-relaxed'>{q.answer}</p></div>:<p className='text-xs text-red-400 font-bold italic'>Not attempted</p>}
                {q.feedback&&<div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2'>AI Feedback</p><p className='text-xs text-gray-400 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 leading-relaxed'>{q.feedback}</p></div>}
              </div></motion.div>))}</div>
          </Sec>)}
        <Sec title='Overall Evaluation Summary' icon={<Award size={16}/>} grad='from-yellow-500 to-orange-500'>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-6'>
            {[{l:'Resume Match',v:scores.resumeMatch,c:'#3b82f6',m:20},{l:'Assessment',v:scores.assessmentScore,c:'#f97316',m:30},{l:'Interview',v:scores.interviewScore,c:'#8b5cf6',m:50},{l:'Ownership',v:scores.ownershipScore,c:'#ec4899',m:10},{l:'Team Fit',v:scores.teamFitScore,c:'#14b8a6',m:100},{l:'Final Score',v:scores.finalScore,c:'#f59e0b',m:100}].map((s,i)=>(<div key={i} className='p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center'><ScoreRing value={s.v} color={s.c} size={80} max={s.m}/><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2'>{s.l}</p></div>))}
          </div>
          <div className={'flex items-center justify-between p-6 rounded-3xl border '+verdict.b}>
            <div><p className='text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1'>Hire Recommendation</p><p className={'text-3xl font-black '+verdict.c}>{verdict.l}</p></div>
            <div className='text-right'><p className={'text-5xl font-black '+verdict.c}>{fs!=null?Math.round(fs):'--'}</p><p className='text-[10px] font-black uppercase tracking-widest text-gray-500'>Overall Score</p></div>
          </div>
        </Sec>
      </div>
    </div>);};
export default CandidateTranscriptPage;