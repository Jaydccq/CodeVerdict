// load-tests/k6/helpers/api.js
// Tagged HTTP wrappers for each endpoint.
// Each function adds the correct tag for threshold matching and returns the raw
// response so the caller can run check() assertions on it.

import http from "k6/http";

const JSON_HEADERS = { "Content-Type": "application/json" };

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function getUpcoming(baseUrl) {
  return http.get(`${baseUrl}/api/exams/upcoming`, {
    tags: { tag: "upcoming" },
  });
}

export function register(baseUrl, student) {
  const body = {
    rollNumber: student.rollNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    password: student.password,
  };
  // Include qaRoleOptIn only when explicitly set on the student object
  if (student.qaRoleOptIn !== undefined) {
    body.qaRoleOptIn = student.qaRoleOptIn;
  }
  return http.post(`${baseUrl}/api/auth/register`, JSON.stringify(body), {
    headers: JSON_HEADERS,
    tags: { tag: "register" },
  });
}

// PATCH /api/user/qa-opt-in - toggle QA role opt-in for an already-logged-in student
export function qaOptIn(baseUrl, token, value) {
  return http.patch(
    `${baseUrl}/api/user/qa-opt-in`,
    JSON.stringify({ qaRoleOptIn: value }),
    { headers: authHeaders(token), tags: { tag: "qa_opt_in" } },
  );
}

export function login(baseUrl, email, password) {
  return http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS, tags: { tag: "login" } },
  );
}

export function enroll(baseUrl, examId, token) {
  return http.post(`${baseUrl}/api/exams/${examId}/enroll`, null, {
    headers: authHeaders(token),
    tags: { tag: "enroll" },
  });
}

export function fetchProblems(baseUrl, examId, token) {
  return http.get(`${baseUrl}/api/exams/${examId}/problems`, {
    headers: authHeaders(token),
    tags: { tag: "fetch_problems" },
  });
}

export function submitMCQ(baseUrl, examId, token, answers) {
  return http.post(
    `${baseUrl}/api/exams/${examId}/mcq-section/submit`,
    JSON.stringify({ answers }),
    { headers: authHeaders(token), tags: { tag: "submit_mcq" } },
  );
}

export function adminLogin(baseUrl, email, password) {
  return http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS },
  );
}

export function createExam(baseUrl, adminToken, examPayload) {
  return http.post(`${baseUrl}/api/admin/exams`, JSON.stringify(examPayload), {
    headers: authHeaders(adminToken),
  });
}

// Note: POST /api/admin/problems (NOT /admin/exams/:id/problems).
// examId goes in the request body as per CreateProblemDto.examId.
export function createProblem(baseUrl, adminToken, problemPayload) {
  return http.post(
    `${baseUrl}/api/admin/problems`,
    JSON.stringify(problemPayload),
    { headers: authHeaders(adminToken) },
  );
}

export function deleteExam(baseUrl, adminToken, examId) {
  return http.del(`${baseUrl}/api/admin/exams/${examId}`, null, {
    headers: authHeaders(adminToken),
  });
}

export function deleteUser(baseUrl, adminToken, userId) {
  return http.del(`${baseUrl}/api/admin/users/${userId}`, null, {
    headers: authHeaders(adminToken),
  });
}
