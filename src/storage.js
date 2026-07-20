// Storage guna Supabase — semua device (laptop, iPad, phone) share DATA SAMA
// secara real-time (perlukan internet untuk save/load).

const SUPABASE_URL = "https://gqvsduowzefnusjonblp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdnNkdW93emVmbnVzam9uYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzA3NjIsImV4cCI6MjEwMDEwNjc2Mn0.37QPGA8iaTgPbIVM8gSnT4kJ0ciKWBXr3Rvn10oyQDw";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

window.storage = {
  async get(key) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_storage?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers }
    );
    if (!res.ok) {
      console.error("Supabase GET failed", res.status, await res.text());
      return null;
    }
    const rows = await res.json();
    if (!rows.length) return null;
    return { key, value: rows[0].value, shared: false };
  },

  async set(key, value) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_storage`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      console.error("Supabase SET failed", res.status, await res.text());
      return null;
    }
    return { key, value, shared: false };
  },

  async delete(key) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_storage?key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers }
    );
    return { key, deleted: res.ok, shared: false };
  },

  async list(prefix = "") {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_storage?key=like.${encodeURIComponent(prefix)}*&select=key`,
      { headers }
    );
    if (!res.ok) return { keys: [], prefix, shared: false };
    const rows = await res.json();
    return { keys: rows.map((r) => r.key), prefix, shared: false };
  },
};
