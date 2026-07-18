// Polyfill ringkas untuk window.storage supaya code artifact asal boleh jalan
// terus di luar Claude, guna localStorage peranti/browser sendiri.
// Nota: ini simpan data DALAM BROWSER tersebut sahaja (bukan cloud/database).
// Untuk data yang sync merentasi banyak peranti/staff, gantikan fail ini
// dengan panggilan ke backend/database sebenar (contoh: Supabase, Firebase).

const PREFIX = "sukamaju:";

function readAll() {
  try {
    const raw = localStorage.getItem(PREFIX + "__all__");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeAll(obj) {
  localStorage.setItem(PREFIX + "__all__", JSON.stringify(obj));
}

window.storage = {
  async get(key) {
    const all = readAll();
    if (!(key in all)) return null;
    return { key, value: all[key], shared: false };
  },
  async set(key, value) {
    const all = readAll();
    all[key] = value;
    writeAll(all);
    return { key, value, shared: false };
  },
  async delete(key) {
    const all = readAll();
    const existed = key in all;
    delete all[key];
    writeAll(all);
    return { key, deleted: existed, shared: false };
  },
  async list(prefix = "") {
    const all = readAll();
    const keys = Object.keys(all).filter((k) => k.startsWith(prefix));
    return { keys, prefix, shared: false };
  },
};
