// load-tests/k6/config.js
// All configuration read from k6 --env flags (set via run-load.sh from .env.local)

export function getConfig() {
  return {
    baseUrl:    __ENV.BASE_URL       || 'http://localhost:3000',
    adminEmail: __ENV.ADMIN_EMAIL,
    adminPass:  __ENV.ADMIN_PASSWORD,
    vus:        parseInt(__ENV.VUS   || '120', 10),
    thinkTime:  parseInt(__ENV.THINK_TIME || '15', 10),
  };
}

export const THRESHOLDS = {
  http_req_failed:                              ['rate<0.01'],
  'http_req_duration{tag:upcoming}':            ['p(95)<500'],
  'http_req_duration{tag:register}':            ['p(95)<1500', 'p(99)<3000'],
  'http_req_duration{tag:login}':               ['p(95)<1000', 'p(99)<2000'],
  'http_req_duration{tag:enroll}':              ['p(95)<1500', 'p(99)<3000'],
  'http_req_duration{tag:fetch_problems}':      ['p(95)<1000', 'p(99)<2000'],
  'http_req_duration{tag:submit_mcq}':          ['p(95)<2000', 'p(99)<5000'],
  'http_req_duration{tag:qa_opt_in}':           ['p(95)<500'],
  http_req_duration:                            ['p(95)<3000'],
};
