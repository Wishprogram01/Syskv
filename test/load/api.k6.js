// Syskv Notes — Grafana k6 load test
// Run: k6 run test/load/api.k6.js
// Options:
//   BASE_URL      API base (default http://localhost:3001/api)
//   K6_ITERATIONS default behavior of executor
//   --vus, --duration override smoke defaults
//
// Scenarios:
//   smoke  — 1 VU, 10s, sanity checks against /api/health
//   load   — ramps to 20 VUs, full CRUD cycle per iteration, self-cleaning

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3001/api';
const TAG = `k6-${Date.now()}`;

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      exec: 'smoke',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },  // ramp up
        { duration: '30s', target: 20 },  // hold
        { duration: '10s', target: 0 },   // ramp down
      ],
      exec: 'load',
      startTime: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],           // <1% failures
    http_req_duration: ['p(95)<300', 'p(99)<600'], // latency budget
    checks: ['rate>0.99'],
  },
};

const jsonHeaders = { 'Content-Type': 'application/json' };

export function smoke() {
  const res = http.get(`${BASE}/health`);
  check(res, {
    'health returns 200': (r) => r.status === 200,
    'health body ok': (r) => r.json().status === 'ok',
  });
  sleep(1);
}

export function load() {
  const title = `${TAG}-${__VU}-${__ITER}`;

  // CREATE
  const created = http.post(
    `${BASE}/notes`,
    JSON.stringify({
      title,
      body: 'load test note\n- item one\n- item two\n\nSee [[Roadmap]]',
      tags: ['k6', 'load'],
      notebook: 'k6',
      pinned: false,
    }),
    { headers: jsonHeaders },
  );
  check(created, { 'create note 200': (r) => r.status === 200 });
  if (created.status !== 200) {
    sleep(0.5);
    return;
  }
  const id = created.json().id;

  // LIST (search by unique title)
  const listed = http.get(`${BASE}/notes?search=${encodeURIComponent(title)}`);
  check(listed, {
    'list notes 200': (r) => r.status === 200,
    'list returns array': (r) => Array.isArray(r.json()),
  });

  // GET ONE
  const got = http.get(`${BASE}/notes/${id}`);
  check(got, {
    'get note 200': (r) => r.status === 200,
    'get note matches title': (r) => r.json().title === title,
  });

  // UPDATE
  const updated = http.put(
    `${BASE}/notes/${id}`,
    JSON.stringify({ body: 'updated during load test', pinned: true }),
    { headers: jsonHeaders },
  );
  check(updated, {
    'update note 200': (r) => r.status === 200,
    'update persisted': (r) => r.json().pinned === true,
  });

  // DELETE (self-cleaning — no leftover notes)
  const del = http.del(`${BASE}/notes/${id}`);
  check(del, { 'delete note 204': (r) => r.status === 204 });

  sleep(0.5);
}