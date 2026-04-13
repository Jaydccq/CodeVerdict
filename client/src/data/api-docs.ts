export interface ApiParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  auth?: string;
  rateLimit?: string;
  requestBody?: ApiParam[];
  queryParams?: ApiParam[];
  pathParams?: ApiParam[];
  responseExample: string;
  requestExample?: string;
  notes?: string[];
  banner?: {
    icon: string;
    title: string;
    message: string;
    color: 'purple' | 'green' | 'blue';
  };
}

export interface ApiGroup {
  id: string;
  title: string;
  icon: string;
  endpoints: ApiEndpoint[];
}

export const apiGroups: ApiGroup[] = [
  {
    id: 'auth',
    title: 'Authentication',
    icon: 'lock',
    endpoints: [
      {
        id: 'auth-register',
        method: 'POST',
        path: '/api/auth/register',
        title: 'Register',
        description:
          'Create a new student account. Email and roll number must be unique. Returns only the user object - no token. Call POST /api/auth/login next to get a JWT.',
        requestBody: [
          {
            name: 'rollNumber',
            type: 'string',
            required: true,
            description:
              'Your unique roll number (max 20 chars, e.g. "CS2024001")',
          },
          {
            name: 'firstName',
            type: 'string',
            required: true,
            description: 'Your first name (max 100 chars)',
          },
          {
            name: 'lastName',
            type: 'string',
            required: true,
            description: 'Your last name (max 100 chars)',
          },
          {
            name: 'email',
            type: 'string',
            required: true,
            description: 'Valid email address (must be unique)',
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            description: 'Password (min 6 characters)',
          },
          {
            name: 'countryCode',
            type: 'string',
            required: false,
            description: 'Country code (max 5 chars, e.g. "+91")',
          },
          {
            name: 'phoneNumber',
            type: 'string',
            required: false,
            description: 'Phone number (max 20 chars)',
          },
          {
            name: 'qaRoleOptIn',
            type: 'boolean',
            required: false,
            description:
              "Set to true if you'd like to be considered for QA Engineering in case you're not selected for the developer role - you can opt in before the exam starts",
          },
        ],
        requestExample: JSON.stringify(
          {
            rollNumber: 'CS2024001',
            firstName: 'Arun',
            lastName: 'Kumar',
            email: 'arun@example.com',
            password: 'securePass123',
            qaRoleOptIn: false,
          },
          null,
          2,
        ),
        responseExample: JSON.stringify(
          {
            user: {
              id: 1,
              email: 'arun@example.com',
              rollNumber: 'CS2024001',
              firstName: 'Arun',
              lastName: 'Kumar',
              role: 'STUDENT',
              metadata: { qaRoleOptIn: false },
            },
          },
          null,
          2,
        ),
        banner: {
          icon: 'bug_report',
          title: 'Interested in QA Engineering? Let us know upfront',
          message:
            'Would you like to be considered for the QA Engineering track if you\'re not selected as a developer? Add "qaRoleOptIn": true at registration - this is your chance to proactively indicate your interest before the exam. You can also update this preference later via PATCH /api/user/qa-opt-in.',
          color: 'purple',
        },
        notes: [
          'No token is returned - registration and login are separate steps.',
          'Both email and roll number must be unique - you cannot register twice.',
          'countryCode and phoneNumber are optional.',
          "Opt in to QA Engineering before the exam if you'd like to be considered for the QA track in case you're not selected for the developer role.",
        ],
      },
      {
        id: 'auth-login',
        method: 'POST',
        path: '/api/auth/login',
        title: 'Login',
        description:
          'Authenticate with your email and password to get a fresh access token.',
        requestBody: [
          {
            name: 'email',
            type: 'string',
            required: true,
            description: 'Your registered email address',
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            description: 'Your password (min 6 characters)',
          },
        ],
        requestExample: JSON.stringify(
          {
            email: 'arun@example.com',
            password: 'securePass123',
          },
          null,
          2,
        ),
        responseExample: JSON.stringify(
          {
            accessToken: 'eyJhbGciOiJIUzI1NiIs...',
            user: {
              id: 1,
              email: 'arun@example.com',
              rollNumber: 'CS2024001',
              firstName: 'Arun',
              lastName: 'Kumar',
              role: 'STUDENT',
              metadata: { qaRoleOptIn: false },
            },
          },
          null,
          2,
        ),
        notes: ['Returns 401 if email or password is incorrect.'],
      },
    ],
  },
  {
    id: 'user',
    title: 'User',
    icon: 'person',
    endpoints: [
      {
        id: 'user-qa-opt-in',
        method: 'PATCH',
        path: '/api/user/qa-opt-in',
        title: 'QA Role Opt-In',
        description:
          "Missed opting in at registration? Use this to indicate you'd like to be considered for the QA Engineering track if you're not selected as a developer. You're choosing this proactively - update your preference any time before the exam ends.",
        auth: 'Bearer Token (JWT)',
        requestBody: [
          {
            name: 'qaRoleOptIn',
            type: 'boolean',
            required: true,
            description:
              "Set to true to indicate you'd like to be considered for QA Engineering if not selected for the developer role, or false to withdraw",
          },
        ],
        requestExample: JSON.stringify({ qaRoleOptIn: true }, null, 2),
        responseExample: JSON.stringify(
          { metadata: { qaRoleOptIn: true } },
          null,
          2,
        ),
        banner: {
          icon: 'bug_report',
          title: 'Your choice, made upfront',
          message:
            "Didn't opt in during registration? You can still let us know you'd like to be considered for QA Engineering if you're not selected as a developer. This is a proactive choice - update your preference any time before the exam ends.",
          color: 'purple',
        },
        notes: [
          'Requires authentication - include your JWT token.',
          'You can withdraw your preference at any time by setting qaRoleOptIn to false.',
        ],
      },
    ],
  },
  {
    id: 'exams',
    title: 'Exams',
    icon: 'quiz',
    endpoints: [
      {
        id: 'exams-upcoming',
        method: 'GET',
        path: '/api/exams/upcoming',
        title: 'Get Exam',
        description:
          'Returns the active exam details including title, time window, duration, and allowed languages. Only returns an exam that has not yet ended. Returns null if none is active or upcoming.',
        responseExample: JSON.stringify(
          {
            id: 1,
            title: 'Mid-Semester Coding Exam',
            startTime: '2026-03-15T09:00:00.000Z',
            endTime: '2026-03-15T12:00:00.000Z',
            durationMinutes: 180,
            allowedLanguages: [71, 54, 62],
          },
          null,
          2,
        ),
        notes: [
          'No authentication required.',
          'Returns null (not 404) if no upcoming or active exam exists.',
          'Use startTime and endTime to display a countdown timer.',
        ],
      },
    ],
  },
  {
    id: 'enrollment',
    title: 'Enrollment',
    icon: 'how_to_reg',
    endpoints: [
      {
        id: 'exams-enroll',
        method: 'POST',
        path: '/api/exams/:id/enroll',
        title: 'Enroll in Exam',
        description:
          'Enroll in an exam. The exam must be active and not yet ended.',
        auth: 'Bearer Token (JWT)',
        pathParams: [
          {
            name: 'id',
            type: 'number',
            required: true,
            description:
              'The exam ID (get it from GET /api/exams/upcoming or the Get Exam endpoint)',
          },
        ],
        responseExample: JSON.stringify(
          {
            id: 1,
            userId: 1,
            examId: 1,
            enrolledAt: '2026-03-15T08:55:00.000Z',
          },
          null,
          2,
        ),
        notes: [
          'Returns 409 if you are already enrolled.',
          'Returns 403 if the exam is not active.',
          'Returns 400 if the exam has already ended.',
        ],
      },
    ],
  },
  {
    id: 'problems',
    title: 'Problems',
    icon: 'code',
    endpoints: [
      {
        id: 'problems-list',
        method: 'GET',
        path: '/api/exams/:examId/problems',
        title: 'List Problems',
        description:
          'Returns all problems for the specified exam, ordered by displayOrder. Only accessible during the exam window. You must be enrolled in the exam.',
        auth: 'Bearer Token (JWT)',
        rateLimit: 'Exam window only',
        pathParams: [
          {
            name: 'examId',
            type: 'number',
            required: true,
            description: 'The exam ID',
          },
        ],
        responseExample: JSON.stringify(
          [
            {
              id: 1,
              title: 'Rate Limiter',
              difficulty: 'medium',
              displayOrder: 1,
              maxScore: 10,
              starterCode: { '71': '# your code here\n' },
            },
          ],
          null,
          2,
        ),
        notes: [
          'Problems are only accessible during the exam window - returns 403 outside it.',
          'difficulty is one of: "easy", "medium", "hard" (lowercase).',
          'Use GET /api/exams/:examId/problems/:id for full details including description and sample I/O.',
        ],
      },
      {
        id: 'problems-detail',
        method: 'GET',
        path: '/api/exams/:examId/problems/:id',
        title: 'Get Problem Details',
        description:
          'Returns full details of a specific problem including description, constraints, sample I/O, and visible test cases. The problem must belong to the specified exam.',
        auth: 'Bearer Token (JWT)',
        rateLimit: 'Exam window only',
        pathParams: [
          {
            name: 'examId',
            type: 'number',
            required: true,
            description: 'The exam ID',
          },
          {
            name: 'id',
            type: 'number',
            required: true,
            description: 'The problem ID',
          },
        ],
        responseExample: JSON.stringify(
          {
            id: 1,
            title: 'Rate Limiter',
            description:
              'Implement a sliding window rate limiter that accepts or rejects requests based on a maximum count within a time window.',
            inputFormat: 'First line: N K\nNext N lines: timestamps',
            outputFormat: 'For each request: 1 or 0',
            constraints: '1 <= N <= 10^5\n1 <= K <= N',
            sampleInput: '5 3\n1 1 2 3 3',
            sampleOutput: '1 1 0 1 0',
            difficulty: 'medium',
            displayOrder: 1,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            maxScore: 10,
          },
          null,
          2,
        ),
        notes: [
          'Returns 404 if the problem does not exist or does not belong to this exam.',
          'timeLimitMs is in milliseconds (e.g. 2000 = 2 seconds).',
          'memoryLimitKb is in kilobytes (e.g. 262144 = 256 MB).',
        ],
      },
    ],
  },
];
