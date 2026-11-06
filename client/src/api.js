const API = 'http://localhost:5000';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // the reply was not JSON
  }

  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  if (data === null) {
    throw new Error('The server sent an unexpected reply. Check the server terminal.');
  }
  return data;
}