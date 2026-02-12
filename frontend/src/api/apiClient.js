// Shared API client for V1 and V2 endpoints
const ENV_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005/api';
// Remove trailing slash if present to avoid double slashes
const BASE_URL = ENV_API_URL.replace(/\/$/, '');

const API_BASE = BASE_URL;
const API_V2_BASE = `${BASE_URL}/v2`;

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Response was not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// V1 API helpers (backward compatible)
export const v1 = {
  get: (path) => request(`${API_BASE}${path}`),
  post: (path, body) => request(`${API_BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  del: (path) => request(`${API_BASE}${path}`, { method: 'DELETE' }),
};

// V2 API helpers
export const v2 = {
  get: (path) => request(`${API_V2_BASE}${path}`),
  post: (path, body) => request(`${API_V2_BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  put: (path, body) => request(`${API_V2_BASE}${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  del: (path) => request(`${API_V2_BASE}${path}`, { method: 'DELETE' }),
  upload: (path, formData) => fetch(`${API_V2_BASE}${path}`, {
    method: 'POST',
    body: formData,
    // No Content-Type header — browser sets multipart boundary automatically
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Upload failed: ${res.status}`);
    }
    return res.json();
  }),
};
