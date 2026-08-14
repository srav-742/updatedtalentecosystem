export const AUTH_LOGIN = 'auth:login';
export const AUTH_REGISTER = 'auth:register';
export const AUTH_REFRESH = 'auth:refresh';
export const AUTH_LOGOUT = 'auth:logout';
export const AUTH_VERIFY = 'auth:verify';

export const JOB_CREATE = 'jobs:create';
export const JOB_READ = 'jobs:read';
export const JOB_UPDATE = 'jobs:update';
export const JOB_DELETE = 'jobs:delete';
export const JOB_MANAGE = 'jobs:manage';

export const JOBS_READ = JOB_READ;
export const JOBS_WRITE = JOB_UPDATE;
export const JOBS_DELETE = JOB_DELETE;
export const JOBS_MANAGE = JOB_MANAGE;

export const CANDIDATES_READ = 'candidates:read';
export const CANDIDATES_WRITE = 'candidates:write';
export const CANDIDATES_DELETE = 'candidates:delete';
export const CANDIDATES_MANAGE = 'candidates:manage';
export const CANDIDATES_PROFILE = 'candidates:profile';

export const RECRUITERS_READ = 'recruiters:read';
export const RECRUITERS_WRITE = 'recruiters:write';
export const RECRUITERS_DELETE = 'recruiters:delete';
export const RECRUITERS_MANAGE = 'recruiters:manage';
export const RECRUITERS_PROFILE = 'recruiters:profile';

export const ADMIN_READ = 'admin:read';
export const ADMIN_WRITE = 'admin:write';
export const ADMIN_DELETE = 'admin:delete';
export const ADMIN_MANAGE = 'admin:manage';
export const ADMIN_USERS = 'admin:users';
export const ADMIN_ANALYTICS = 'admin:analytics';

export const ASSESSMENTS_READ = 'assessments:read';
export const ASSESSMENTS_WRITE = 'assessments:write';
export const ASSESSMENTS_DELETE = 'assessments:delete';
export const ASSESSMENTS_SUBMIT = 'assessments:submit';
export const ASSESSMENTS_EVALUATE = 'assessments:evaluate';

export const INTERVIEW_CREATE = 'interviews:create';
export const INTERVIEW_READ = 'interviews:read';
export const INTERVIEW_UPDATE = 'interviews:update';
export const INTERVIEW_DELETE = 'interviews:delete';
export const INTERVIEW_SCHEDULE = 'interviews:schedule';
export const INTERVIEW_MANAGE = 'interviews:manage';

export const INTERVIEWS_READ = INTERVIEW_READ;
export const INTERVIEWS_WRITE = INTERVIEW_UPDATE;
export const INTERVIEWS_DELETE = INTERVIEW_DELETE;
export const INTERVIEWS_SCHEDULE = INTERVIEW_SCHEDULE;
export const INTERVIEWS_MANAGE = INTERVIEW_MANAGE;

export const RESUMES_READ = 'resumes:read';
export const RESUMES_WRITE = 'resumes:write';
export const RESUMES_DELETE = 'resumes:delete';
export const RESUMES_PARSE = 'resumes:parse';

export const NOTIFICATIONS_READ = 'notifications:read';
export const NOTIFICATIONS_WRITE = 'notifications:write';
export const NOTIFICATIONS_DELETE = 'notifications:delete';
export const NOTIFICATIONS_MANAGE = 'notifications:manage';

export const PERMISSIONS = Object.freeze({
  AUTH_LOGIN,
  AUTH_REGISTER,
  AUTH_REFRESH,
  AUTH_LOGOUT,
  AUTH_VERIFY,
  
  JOB_CREATE,
  JOB_READ,
  JOB_UPDATE,
  JOB_DELETE,
  JOB_MANAGE,
  JOBS_READ,
  JOBS_WRITE,
  JOBS_DELETE,
  JOBS_MANAGE,

  CANDIDATES_READ,
  CANDIDATES_WRITE,
  CANDIDATES_DELETE,
  CANDIDATES_MANAGE,
  CANDIDATES_PROFILE,

  RECRUITERS_READ,
  RECRUITERS_WRITE,
  RECRUITERS_DELETE,
  RECRUITERS_MANAGE,
  RECRUITERS_PROFILE,

  ADMIN_READ,
  ADMIN_WRITE,
  ADMIN_DELETE,
  ADMIN_MANAGE,
  ADMIN_USERS,
  ADMIN_ANALYTICS,

  ASSESSMENTS_READ,
  ASSESSMENTS_WRITE,
  ASSESSMENTS_DELETE,
  ASSESSMENTS_SUBMIT,
  ASSESSMENTS_EVALUATE,

  INTERVIEW_CREATE,
  INTERVIEW_READ,
  INTERVIEW_UPDATE,
  INTERVIEW_DELETE,
  INTERVIEW_SCHEDULE,
  INTERVIEW_MANAGE,
  INTERVIEWS_READ,
  INTERVIEWS_WRITE,
  INTERVIEWS_DELETE,
  INTERVIEWS_SCHEDULE,
  INTERVIEWS_MANAGE,

  RESUMES_READ,
  RESUMES_WRITE,
  RESUMES_DELETE,
  RESUMES_PARSE,

  NOTIFICATIONS_READ,
  NOTIFICATIONS_WRITE,
  NOTIFICATIONS_DELETE,
  NOTIFICATIONS_MANAGE,
});

export default PERMISSIONS;
