import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutGrid, ShoppingCart, Package, Users, FileText, Settings as SettingsIcon,
  Plus, Minus, Trash2, X, Search, Bell, Menu, LogOut, TrendingUp, TrendingDown,
  AlertTriangle, ChevronRight, ChevronLeft, Download, Printer, Check, Pencil,
  Wallet, Receipt, Activity, ImagePlus, KeyRound, ShieldCheck
} from "lucide-react";

/* ---------------- Utilities ---------------- */
const fmt = (n) => "RM " + (Math.round((n || 0) * 100) / 100).toFixed(2);
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const dayLabel = (d) => new Date(d).toLocaleDateString("ms-MY", { weekday: "short", day: "numeric", month: "short" });

function resizeImage(file, maxW = 260, quality = 0.62) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Design tokens ----------------
  Palette: base #0B0C0D (matte black), surface #17181A, surface-2 #1F2123,
  hairline #2B2D30, ink #F2F1EC, muted #8B8D92, gold #C9A24B (premium accent),
  green #35C275 (profit), red #E5534B (alerts/debt), blue #4C8DFF (info)
  Display type: 'Sora' (numbers/headings) — Body: 'Inter'
------------------------------------------------- */
const T = {
  bg: "#0B0C0D",
  surface: "#17181A",
  surface2: "#1F2123",
  hair: "#2A2C2F",
  ink: "#F2F1EC",
  muted: "#8B8D92",
  gold: "#C9A24B",
  goldSoft: "#3A331F",
  green: "#35C275",
  greenSoft: "#16281F",
  red: "#E5534B",
  redSoft: "#2B1918",
  blue: "#4C8DFF",
};

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
`;

/* ---------------- Seed data ---------------- */
const SEED_USERS = [
  { id: "u_hairul", nama: "Hairul", role: "Admin", pin: "1234" },
  { id: "u_aiman", nama: "Aiman", role: "Pekerja", pin: "1111" },
  { id: "u_hakim", nama: "Hakim", role: "Pekerja", pin: "2222" },
];

/* ---------------- Responsive breakpoint ---------------- */
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 400);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (w >= 1100) return { name: "desktop", maxWidth: 980, posCols: 4, statCols: 4 };
  if (w >= 700) return { name: "tablet", maxWidth: 720, posCols: 3, statCols: 4 };
  return { name: "mobile", maxWidth: 480, posCols: 2, statCols: 2 };
}

/* ---------------- Root App ---------------- */
export default function SukaMajuManager() {
  const [loaded, setLoaded] = useState(false);
  const [users, setUsers] = useState(SEED_USERS);
  const [produk, setProduk] = useState([]);
  const [jualan, setJualan] = useState([]);
  const [restock, setRestock] = useState([]);
  const [hutang, setHutang] = useState([]);
  const [expense, setExpense] = useState([]);
  const [log, setLog] = useState([]);
  const [settings, setSettings] = useState({ namaPerniagaan: "SUKA MAJU" });

  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [dismissedNotif, setDismissedNotif] = useState({});
  const bp = useBreakpoint();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const addLog = (aksi) => {
    setLog((l) => [{ id: uid(), masa: new Date().toISOString(), userNama: currentUser?.nama || "Sistem", aksi }, ...l]);
  };

  /* ---- load/save (localStorage — jalan kat mana-mana browser/hosting) ---- */
  useEffect(() => {
    const keys = [
      ["sm-users", setUsers, SEED_USERS],
      ["sm-produk", setProduk, []],
      ["sm-jualan", setJualan, []],
      ["sm-restock", setRestock, []],
      ["sm-hutang", setHutang, []],
      ["sm-expense", setExpense, []],
      ["sm-log", setLog, []],
      ["sm-settings", setSettings, { namaPerniagaan: "SUKA MAJU" }],
    ];
    for (const [key, setter, fallback] of keys) {
      try {
        const raw = localStorage.getItem(key);
        setter(raw ? JSON.parse(raw) : fallback);
      } catch (e) {
        setter(fallback);
      }
    }
    setLoaded(true);
  }, []);

  const persist = (key, val) => {
    if (!loaded) return;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  };
  useEffect(() => persist("sm-users", users), [users, loaded]);
  useEffect(() => persist("sm-produk", produk), [produk, loaded]);
  useEffect(() => persist("sm-jualan", jualan), [jualan, loaded]);
  useEffect(() => persist("sm-restock", restock), [restock, loaded]);
  useEffect(() => persist("sm-hutang", hutang), [hutang, loaded]);
  useEffect(() => persist("sm-expense", expense), [expense, loaded]);
  useEffect(() => persist("sm-log", log), [log, loaded]);
  useEffect(() => persist("sm-settings", settings), [settings, loaded]);


  /* ---- derived ---- */
  const stokRendah = produk.filter((p) => p.stok <= (p.minStok ?? 5));
  const notifs = useMemo(() => {
    const arr = stokRendah.map((p) => ({ id: "stok-" + p.id, text: `${p.nama} tinggal ${p.stok} unit`, type: "warn" }));
    return arr.filter((n) => !dismissedNotif[n.id]);
  }, [stokRendah, dismissedNotif]);

  const isAdmin = currentUser?.role === "Admin";

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.muted, fontFamily: "Inter" }}>
        <style>{FONT}{`
          @keyframes smPulse { 0%,100% { transform: scale(0.85); opacity: 0.5; } 50% { transform: scale(1.05); opacity: 1; } }
          @keyframes smDot { 0%,80%,100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }
        `}</style>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: T.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", animation: "smPulse 1.4s ease-in-out infinite", marginBottom: 16 }}>
          <ShieldCheck size={22} color={T.gold} />
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: 99, background: T.gold, animation: `smDot 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen users={users} settings={settings} onLogin={(u) => { setCurrentUser(u); addLog(`${u.nama} log masuk`); }} />;
  }

  const ctx = {
    T, users, setUsers, produk, setProduk, jualan, setJualan, restock, setRestock,
    hutang, setHutang, expense, setExpense, log, settings, setSettings,
    currentUser, isAdmin, showToast, addLog, stokRendah, bp,
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter',sans-serif", color: T.ink, display: "flex", justifyContent: "center" }}>
      <style>{`${FONT}
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:0;height:0;}
        .smTap{ transition: transform .12s ease, opacity .12s ease; -webkit-tap-highlight-color: transparent; cursor:pointer; }
        .smTap:active{ transform: scale(0.95); opacity:0.82; }
        @keyframes smSheetUp { from { transform: translateY(24px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes smFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; }
        }
        @media (min-width: 700px) {
          .sm-grid-pos { grid-template-columns: repeat(${bp.posCols}, 1fr) !important; }
          .sm-grid-stat { grid-template-columns: repeat(${bp.statCols}, 1fr) !important; }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: bp.maxWidth, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", background: T.bg, transition: "max-width 0.2s ease" }}>
        {/* Topbar */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", position: "sticky", top: 0, background: T.bg, zIndex: 30, borderBottom: `1px solid ${T.hair}` }}>
          <button onClick={() => setDrawerOpen(true)} style={iconBtnStyle}><Menu size={19} color={T.ink} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {settings.logo && (
              <img src={settings.logo} alt="logo" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover", border: `1px solid ${T.hair}` }} />
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>{settings.namaPerniagaan}</div>
              <div style={{ fontSize: 10.5, color: T.muted }}>{currentUser.nama} · {currentUser.role}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setSearchOpen(true)} style={iconBtnStyle}><Search size={18} color={T.ink} /></button>
            <button onClick={() => setNotifOpen(true)} style={{ ...iconBtnStyle, position: "relative" }}>
              <Bell size={18} color={T.ink} />
              {notifs.length > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: T.red }} />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="no-print" style={{ flex: 1, padding: "16px 16px 100px", overflowY: "auto" }}>
          {tab === "dashboard" && <Dashboard ctx={ctx} />}
          {tab === "pos" && <POS ctx={ctx} />}
          {tab === "inventori" && <Inventori ctx={ctx} />}
          {tab === "restock" && <Restock ctx={ctx} />}
          {tab === "hutang" && <Hutang ctx={ctx} />}
          {tab === "laporan" && <Laporan ctx={ctx} />}
          {tab === "toppembeli" && <TopPembeli ctx={ctx} />}
          {tab === "log" && isAdmin && <ActivityLog ctx={ctx} />}
          {tab === "settings" && isAdmin && <SettingsTab ctx={ctx} />}
        </div>

        {/* Bottom nav */}
        <div className="no-print" style={{ position: "sticky", bottom: 0, display: "flex", background: T.surface, borderTop: `1px solid ${T.hair}`, maxWidth: bp.maxWidth, width: "100%" }}>
          <NavBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={LayoutGrid} label="Dashboard" />
          <NavBtn active={tab === "pos"} onClick={() => setTab("pos")} icon={ShoppingCart} label="POS" />
          <NavBtn active={tab === "inventori"} onClick={() => setTab("inventori")} icon={Package} label="Stok" />
          <NavBtn active={tab === "hutang"} onClick={() => setTab("hutang")} icon={Wallet} label="Hutang" />
          <NavBtn active={["restock", "laporan", "toppembeli", "log", "settings"].includes(tab)} onClick={() => setDrawerOpen(true)} icon={Menu} label="Lagi" />
        </div>

        {/* Quick action FAB */}
        <button
          className="no-print"
          onClick={() => setQuickOpen(true)}
          style={{
            position: "absolute", right: 16, bottom: 78, width: 52, height: 52, borderRadius: 999,
            background: T.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 20px rgba(201,162,75,0.35)", cursor: "pointer", zIndex: 40,
          }}
        >
          <Plus size={24} color="#141414" strokeWidth={2.6} />
        </button>

        {drawerOpen && <Drawer ctx={ctx} tab={tab} setTab={setTab} onClose={() => setDrawerOpen(false)} onLogout={() => { addLog(`${currentUser.nama} log keluar`); setCurrentUser(null); }} />}
        {searchOpen && <SearchOverlay ctx={ctx} setTab={setTab} onClose={() => setSearchOpen(false)} />}
        {notifOpen && <NotifOverlay notifs={notifs} onDismiss={(id) => setDismissedNotif((d) => ({ ...d, [id]: true }))} onClose={() => setNotifOpen(false)} />}
        {quickOpen && <QuickActions ctx={ctx} setTab={setTab} onClose={() => setQuickOpen(false)} />}

        {toast && (
          <div style={{ position: "absolute", bottom: 140, left: "50%", transform: "translateX(-50%)", background: T.surface2, border: `1px solid ${T.hair}`, color: T.ink, padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", zIndex: 60 }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtnStyle = { background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" };

function NavBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className="smTap" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", background: "none", border: "none", color: active ? T.gold : T.muted }}>
      <Icon size={19} strokeWidth={active ? 2.4 : 2} />
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function Card({ children, style, className }) {
  return <div className={className} style={{ background: T.surface, border: `1px solid ${T.hair}`, borderRadius: 16, padding: 16, ...style }}>{children}</div>;
}

/* ---------------- Login ---------------- */
function LoginScreen({ users, settings, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const press = (d) => {
    setError(false);
    if (d === "back") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (selected.pin === next) {
        setTimeout(() => onLogin(selected), 150);
      } else {
        setTimeout(() => { setError(true); setPin(""); }, 200);
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 15% 8%, rgba(201,162,75,0.16), transparent 45%), radial-gradient(circle at 88% 92%, rgba(76,141,255,0.10), transparent 40%), ${T.bg}`, display: "flex", justifyContent: "center", fontFamily: "'Inter',sans-serif", color: T.ink, position: "relative", overflow: "hidden" }}>
      <style>{`${FONT}
        @keyframes smFloat1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(14px,-18px); } }
        @keyframes smFloat2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-16px,16px); } }
        @keyframes smShake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
        @keyframes smRise { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .smTap{ transition: transform .12s ease, opacity .12s ease; -webkit-tap-highlight-color: transparent; cursor:pointer; }
        .smTap:active{ transform: scale(0.94); opacity:0.8; }
      `}</style>
      <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "rgba(201,162,75,0.10)", filter: "blur(60px)", top: "-8%", left: "-10%", animation: "smFloat1 9s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "rgba(76,141,255,0.09)", filter: "blur(60px)", bottom: "-6%", right: "-8%", animation: "smFloat2 11s ease-in-out infinite" }} />

      <div style={{ width: "100%", maxWidth: 420, padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: T.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden", boxShadow: "0 10px 28px rgba(201,162,75,0.22)", animation: "smRise 0.5s ease" }}>
          {settings.logo ? <img src={settings.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ShieldCheck size={28} color={T.gold} />}
        </div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 23, letterSpacing: 0.3, animation: "smRise 0.5s ease 0.05s backwards" }}>{settings.namaPerniagaan}</div>
        <div style={{ color: T.muted, fontSize: 13, marginTop: 2, marginBottom: 28, animation: "smRise 0.5s ease 0.1s backwards" }}>Business Management System</div>

        <div style={{
          width: "100%", background: "rgba(23,24,26,0.55)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 22,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)", animation: "smRise 0.5s ease 0.15s backwards",
        }}>
          {!selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 700, marginBottom: 2, letterSpacing: 0.4 }}>PILIH PENGGUNA</div>
              {users.map((u) => (
                <button key={u.id} className="smTap" onClick={() => setSelected(u)} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 15, padding: "13px 15px", color: T.ink, textAlign: "left" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: T.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: T.gold, flexShrink: 0 }}>
                    {u.nama[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{u.nama}</div>
                    <div style={{ fontSize: 11.5, color: T.muted }}>{u.role}</div>
                  </div>
                  <ChevronRight size={16} color={T.muted} style={{ marginLeft: "auto" }} />
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button className="smTap" onClick={() => { setSelected(null); setPin(""); setError(false); }} style={{ alignSelf: "flex-start", background: "none", border: "none", color: T.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, marginBottom: 16 }}>
                <ChevronLeft size={14} /> Tukar pengguna
              </button>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: T.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: T.gold, marginBottom: 8 }}>
                {selected.nama[0]}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.nama}</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 18, display: "flex", alignItems: "center", gap: 5 }}><KeyRound size={12} /> Masukkan PIN 4-digit</div>
              <div style={{ display: "flex", gap: 12, marginBottom: 22, animation: error ? "smShake 0.4s ease" : "none" }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: 13, height: 13, borderRadius: 99, background: pin.length > i ? (error ? T.red : T.gold) : "rgba(255,255,255,0.12)", transition: "background 0.15s, transform 0.15s", transform: pin.length > i ? "scale(1.1)" : "scale(1)" }} />
                ))}
              </div>
              {error && <div style={{ color: T.red, fontSize: 12.5, marginTop: -12, marginBottom: 14 }}>PIN salah, cuba lagi</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%", maxWidth: 240 }}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((d, i) =>
                  d === "" ? <div key={i} /> : (
                    <button key={i} className="smTap" onClick={() => press(d)} style={{ height: 54, borderRadius: 14, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", color: T.ink, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {d === "back" ? "⌫" : d}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ ctx }) {
  const { produk, jualan, hutang, expense, T: t, stokRendah } = ctx;
  const today = todayStr();
  const todaySales = jualan.filter((j) => j.tarikh === today);
  const todayTotal = todaySales.reduce((s, j) => s + j.total, 0);
  const todayUntung = todaySales.reduce((s, j) => s + j.untung, 0);
  const nilaiInventori = produk.reduce((s, p) => s + p.hargaModal * p.stok, 0);
  const jumlahHutang = hutang.reduce((s, h) => s + Math.max(0, h.jumlah - (h.bayaran || []).reduce((a, b) => a + b.jumlah, 0)), 0);
  const cashMasuk = jualan.reduce((s, j) => s + j.total, 0) + hutang.reduce((s, h) => s + (h.bayaran || []).reduce((a, b) => a + b.jumlah, 0), 0);
  const cashKeluar = ctx.restock.reduce((s, r) => s + r.jumlah, 0) + expense.reduce((s, e) => s + e.jumlah, 0);
  const cashSemasa = cashMasuk - cashKeluar;

  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const total = jualan.filter((j) => j.tarikh === ds).reduce((s, j) => s + j.total, 0);
      arr.push({ label: d.toLocaleDateString("ms-MY", { weekday: "narrow" }), total, ds });
    }
    return arr;
  }, [jualan]);
  const maxVal = Math.max(1, ...last7.map((d) => d.total));

  const terlaris = useMemo(() => {
    const map = {};
    jualan.forEach((j) => j.items.forEach((it) => { map[it.nama] = (map[it.nama] || 0) + it.qty; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [jualan]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="sm-grid-stat" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCard label="JUALAN HARI INI" value={fmt(todayTotal)} sub={`${todaySales.length} transaksi`} color={t.ink} />
        <StatCard label="UNTUNG HARI INI" value={fmt(todayUntung)} sub="margin bersih" color={t.green} />
        <StatCard label="CASH SEMASA" value={fmt(cashSemasa)} sub="anggaran" color={t.ink} />
        <StatCard label="HUTANG TERTUNGGAK" value={fmt(jumlahHutang)} sub={`${hutang.length} pelanggan`} color={t.red} />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.muted }}>JUALAN 7 HARI</div>
          <div style={{ fontSize: 11, color: t.muted }}>Nilai Inventori: <span style={{ color: t.ink, fontWeight: 700 }}>{fmt(nilaiInventori)}</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
          {last7.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: Math.max(4, (d.total / maxVal) * 70), background: d.ds === today ? t.gold : t.surface2, borderRadius: 5, border: `1px solid ${t.hair}` }} />
              <span style={{ fontSize: 10, color: t.muted }}>{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {terlaris.length > 0 && (
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.muted, marginBottom: 10 }}>PRODUK TERLARIS</div>
          {terlaris.map(([nama, qty], i) => (
            <div key={nama} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < terlaris.length - 1 ? `1px solid ${t.hair}` : "none" }}>
              <span style={{ fontSize: 13.5 }}>{i + 1}. {nama}</span>
              <span style={{ fontSize: 13, color: t.gold, fontWeight: 700 }}>{qty} unit</span>
            </div>
          ))}
        </Card>
      )}

      {stokRendah.length > 0 && (
        <Card style={{ background: t.redSoft, borderColor: "#4A2B27" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: t.red, fontSize: 13, marginBottom: 8 }}>
            <AlertTriangle size={15} /> Stok Hampir Habis
          </div>
          {stokRendah.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span>{p.nama}</span>
              <span style={{ fontWeight: 700 }}>{p.stok} tinggal</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 700, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, marginTop: 4, color }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>
    </Card>
  );
}

/* ---------------- POS ---------------- */
function POS({ ctx }) {
  const { produk, setProduk, setJualan, currentUser, addLog, showToast, T: t } = ctx;
  const [cart, setCart] = useState({});
  const [cat, setCat] = useState("Semua");
  const [burst, setBurst] = useState(null);

  const kategoris = ["Semua", ...Array.from(new Set(produk.map((p) => p.kategori || "Lain")))];
  const list = cat === "Semua" ? produk : produk.filter((p) => (p.kategori || "Lain") === cat);

  const add = (id, delta) => {
    setCart((c) => {
      const p = produk.find((x) => x.id === id);
      const next = Math.max(0, Math.min(p ? p.stok : 99, (c[id] || 0) + delta));
      return { ...c, [id]: next };
    });
  };

  const items = Object.entries(cart).filter(([_, q]) => q > 0);
  const total = items.reduce((s, [id, q]) => { const p = produk.find((x) => x.id === id); return s + (p ? p.hargaJual * q : 0); }, 0);
  const untung = items.reduce((s, [id, q]) => { const p = produk.find((x) => x.id === id); return s + (p ? (p.hargaJual - p.hargaModal) * q : 0); }, 0);

  const [showNamaForm, setShowNamaForm] = useState(false);
  const [namaPembeli, setNamaPembeli] = useState("");

  const bukaFormNama = () => {
    if (items.length === 0) return showToast("Belum pilih barang");
    setNamaPembeli("");
    setShowNamaForm(true);
  };

  const finalizeCheckout = () => {
    const nama = namaPembeli.trim();
    if (!nama) return showToast("Sila isi nama pembeli dulu");
    const its = items.map(([id, q]) => { const p = produk.find((x) => x.id === id); return { produkId: id, nama: p.nama, qty: q, hargaJual: p.hargaJual, hargaModal: p.hargaModal }; });
    setJualan((j) => [{ id: uid(), tarikh: todayStr(), masa: new Date().toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }), userId: currentUser.id, userNama: currentUser.nama, pembeli: nama, items: its, total, untung }, ...j]);
    setProduk((p) => p.map((prod) => { const f = items.find(([id]) => id === prod.id); return f ? { ...prod, stok: Math.max(0, prod.stok - f[1]) } : prod; }));
    addLog(`${currentUser.nama} jual kepada ${nama} (${fmt(total)})`);
    setCart({});
    setShowNamaForm(false);
    setBurst(fmt(total));
    setTimeout(() => setBurst(null), 1300);
  };

  if (produk.length === 0) return <EmptyState text="Tambah produk dulu kat tab Stok sebelum boleh jual." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {burst && <SuccessBurst amount={burst} />}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {kategoris.map((k) => (
          <button key={k} onClick={() => setCat(k)} style={{ whiteSpace: "nowrap", padding: "7px 14px", borderRadius: 999, border: `1px solid ${cat === k ? t.gold : t.hair}`, background: cat === k ? t.goldSoft : "transparent", color: cat === k ? t.gold : t.muted, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{k}</button>
        ))}
      </div>

      <div className="sm-grid-pos" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {list.map((p) => (
          <Card key={p.id} className="smTap" style={{ padding: 10 }}>
            <div style={{ width: "100%", height: 84, borderRadius: 10, background: t.surface2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 }}>
              {p.gambar ? <img src={p.gambar} alt={p.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Package size={26} color={t.muted} />}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{p.nama}</div>
            <div style={{ fontSize: 12, color: t.gold, fontWeight: 700, marginTop: 2 }}>{fmt(p.hargaJual)}</div>
            <div style={{ fontSize: 10.5, color: p.stok === 0 ? t.red : t.muted, marginTop: 1 }}>stok {p.stok}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <button onClick={() => add(p.id, -1)} className="smTap" style={miniBtn(t)}><Minus size={13} /></button>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{cart[p.id] || 0}</span>
              <button onClick={() => add(p.id, 1)} disabled={p.stok === 0} className="smTap" style={{ ...miniBtn(t), background: p.stok === 0 ? t.hair : t.gold, color: "#141414", border: "none" }}><Plus size={13} /></button>
            </div>
          </Card>
        ))}
      </div>

      {items.length > 0 && (
        <div style={{ position: "sticky", bottom: 72, background: t.surface2, border: `1px solid ${t.hair}`, borderRadius: 16, padding: 14, marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: t.muted, marginBottom: 4 }}>
            <span>{items.length} jenis · {items.reduce((s, [, q]) => s + q, 0)} unit</span>
            <span>Untung {fmt(untung)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800 }}>{fmt(total)}</span>
            <button onClick={bukaFormNama} className="smTap" style={{ background: t.gold, color: "#141414", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 800 }}>Jual</button>
          </div>
        </div>
      )}

      {showNamaForm && (
        <BottomSheet onClose={() => setShowNamaForm(false)} title="Nama Pembeli">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12.5, color: t.muted, marginBottom: -2 }}>
              Wajib isi nama pembeli untuk setiap jualan (rekod siapa beli apa).
            </div>
            <Input label="Nama pembeli" value={namaPembeli} onChange={setNamaPembeli} placeholder="cth: Bilik 12 - Danish" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: t.muted, padding: "4px 2px" }}>
              <span>Jumlah</span>
              <span style={{ fontWeight: 700, color: t.ink }}>{fmt(total)}</span>
            </div>
            <button onClick={finalizeCheckout} className="smTap" style={primaryBtn(t)}>Sahkan Jualan</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

const miniBtn = (t) => ({ width: 26, height: 26, borderRadius: 999, border: `1px solid ${t.hair}`, background: t.surface, color: t.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });

function EmptyState({ text }) {
  return <div style={{ textAlign: "center", color: T.muted, padding: "50px 20px", fontSize: 13.5 }}>{text}</div>;
}

/* Celebratory "cha-ching" burst shown briefly after a successful sale */
function SuccessBurst({ amount }) {
  const particles = ["💰", "✨", "🪙", "✨", "💵", "⭐"];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <style>{`
        @keyframes smBounceIn { 0% { transform: scale(0.3); opacity: 0; } 55% { transform: scale(1.12); opacity: 1; } 75% { transform: scale(0.95); } 100% { transform: scale(1); } }
        @keyframes smFadeOut { 0%,70% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes smParticle { 0% { transform: translate(0,0) scale(0.6); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1.1); opacity: 0; } }
      `}</style>
      <div style={{ position: "relative", animation: "smFadeOut 1.3s ease forwards" }}>
        {particles.map((p, i) => {
          const angle = (i / particles.length) * Math.PI * 2;
          const dx = Math.cos(angle) * 70, dy = Math.sin(angle) * 70;
          return (
            <span key={i} style={{ position: "absolute", left: "50%", top: "50%", fontSize: 20, animation: `smParticle 0.9s ease-out forwards`, "--dx": `${dx}px`, "--dy": `${dy}px` }}>{p}</span>
          );
        })}
        <div style={{ background: T.gold, color: "#141414", borderRadius: 20, padding: "18px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: "smBounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 12px 32px rgba(201,162,75,0.4)" }}>
          <Check size={26} strokeWidth={3} />
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17 }}>{amount}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Inventori ---------------- */
function Inventori({ ctx }) {
  const { produk, setProduk, addLog, showToast, T: t } = ctx;
  const [modal, setModal] = useState(null); // null | 'new' | product object
  const blank = { nama: "", kategori: "", hargaModal: "", hargaJual: "", stok: "", minStok: "5", gambar: "" };
  const [form, setForm] = useState(blank);
  const fileRef = useRef();

  const openNew = () => { setForm(blank); setModal("new"); };
  const openEdit = (p) => { setForm({ ...p, hargaModal: String(p.hargaModal), hargaJual: String(p.hargaJual), stok: String(p.stok), minStok: String(p.minStok) }); setModal(p.id); };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await resizeImage(file);
      setForm((f) => ({ ...f, gambar: b64 }));
    } catch (err) { showToast("Gagal upload gambar"); }
  };

  const save = () => {
    if (!form.nama || form.hargaModal === "" || form.hargaJual === "") return showToast("Isi semua ruangan wajib");
    const data = {
      nama: form.nama, kategori: form.kategori || "Lain",
      hargaModal: parseFloat(form.hargaModal) || 0, hargaJual: parseFloat(form.hargaJual) || 0,
      stok: parseInt(form.stok) || 0, minStok: parseInt(form.minStok) || 5, gambar: form.gambar || "",
    };
    if (modal === "new") {
      setProduk((p) => [...p, { id: uid(), ...data }]);
      addLog(`Tambah produk: ${data.nama}`);
      showToast("Produk ditambah");
    } else {
      setProduk((p) => p.map((x) => (x.id === modal ? { ...x, ...data } : x)));
      addLog(`Kemas kini produk: ${data.nama}`);
      showToast("Produk dikemas kini");
    }
    setModal(null);
  };

  const del = (p) => { setProduk((arr) => arr.filter((x) => x.id !== p.id)); addLog(`Padam produk: ${p.nama}`); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={openNew} className="smTap" style={primaryBtn(t)}><Plus size={16} /> Tambah Produk</button>

      {produk.length === 0 && <EmptyState text="Belum ada produk. Tambah produk pertama kau." />}

      {produk.map((p) => {
        const status = p.stok === 0 ? { label: "Habis", color: t.red } : p.stok <= p.minStok ? { label: "Stok Rendah", color: t.gold } : { label: "Aktif", color: t.green };
        return (
          <Card key={p.id} style={{ display: "flex", gap: 12, padding: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: t.surface2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {p.gambar ? <img src={p.gambar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Package size={22} color={t.muted} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nama}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.color + "22", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{status.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2 }}>{p.kategori} · Modal {fmt(p.hargaModal)} → Jual {fmt(p.hargaJual)}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 12.5, color: status.color === t.red ? t.red : t.ink, fontWeight: 700 }}>Stok: {p.stok}</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted }}><Pencil size={15} /></button>
                  <button onClick={() => del(p)} style={{ background: "none", border: "none", cursor: "pointer", color: t.red }}><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {modal && (
        <BottomSheet onClose={() => setModal(null)} title={modal === "new" ? "Tambah Produk" : "Kemas Kini Produk"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <button onClick={() => fileRef.current.click()} style={{ width: 84, height: 84, borderRadius: 14, background: t.surface2, border: `1px dashed ${t.hair}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                {form.gambar ? <img src={form.gambar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImagePlus size={22} color={t.muted} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
            </div>
            <Input label="Nama produk" value={form.nama} onChange={(v) => setForm((f) => ({ ...f, nama: v }))} placeholder="cth: Keropok Lekor" />
            <Input label="Kategori" value={form.kategori} onChange={(v) => setForm((f) => ({ ...f, kategori: v }))} placeholder="cth: Snek" />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Harga modal" type="number" value={form.hargaModal} onChange={(v) => setForm((f) => ({ ...f, hargaModal: v }))} placeholder="0.50" />
              <Input label="Harga jual" type="number" value={form.hargaJual} onChange={(v) => setForm((f) => ({ ...f, hargaJual: v }))} placeholder="1.00" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Stok" type="number" value={form.stok} onChange={(v) => setForm((f) => ({ ...f, stok: v }))} placeholder="20" />
              <Input label="Stok minimum" type="number" value={form.minStok} onChange={(v) => setForm((f) => ({ ...f, minStok: v }))} placeholder="5" />
            </div>
            <button onClick={save} style={{ ...primaryBtn(t), marginTop: 6 }}>Simpan</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: T.muted, fontWeight: 700 }}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        style={{ border: `1px solid ${T.hair}`, background: T.surface2, color: T.ink, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "Inter", outline: "none" }} />
    </label>
  );
}

function BottomSheet({ children, onClose, title }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 14, animation: "smFadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "rgba(28,29,32,0.82)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", border: "1px solid rgba(255,255,255,0.09)", width: "100%", maxWidth: 460, borderRadius: 26, padding: 20, paddingBottom: 28, maxHeight: "85vh", overflowY: "auto", marginBottom: 8, boxShadow: "0 24px 60px rgba(0,0,0,0.45)", animation: "smSheetUp 0.28s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Sora',sans-serif" }}>{title}</div>
          <button className="smTap" onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink }}><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const primaryBtn = (t) => ({ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: t.gold, color: "#141414", border: "none", borderRadius: 12, padding: "12px", fontWeight: 800, cursor: "pointer", fontSize: 14 });

/* ---------------- Restock ---------------- */
function Restock({ ctx }) {
  const { produk, setProduk, restock, setRestock, addLog, showToast, currentUser, T: t } = ctx;
  const [form, setForm] = useState({ produkId: "", hargaBeli: "", qty: "", updateModal: true });

  const submit = () => {
    const p = produk.find((x) => x.id === form.produkId);
    if (!p || !form.hargaBeli || !form.qty) return showToast("Lengkapkan borang restock");
    const hargaBeli = parseFloat(form.hargaBeli), qty = parseInt(form.qty), jumlah = hargaBeli * qty;
    setRestock((r) => [{ id: uid(), tarikh: todayStr(), produkId: p.id, nama: p.nama, hargaBeli, qty, jumlah, userNama: currentUser.nama }, ...r]);
    setProduk((arr) => arr.map((x) => (x.id === p.id ? { ...x, stok: x.stok + qty, hargaModal: form.updateModal ? hargaBeli : x.hargaModal } : x)));
    addLog(`Restock ${p.nama} +${qty} unit (${fmt(jumlah)})`);
    showToast("Restock direkod");
    setForm({ produkId: "", hargaBeli: "", qty: "", updateModal: true });
  };

  if (produk.length === 0) return <EmptyState text="Tambah produk dulu sebelum restock." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, fontFamily: "'Sora',sans-serif" }}>Rekod Beli Stok</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>Produk
            <select value={form.produkId} onChange={(e) => setForm((f) => ({ ...f, produkId: e.target.value }))}
              style={{ width: "100%", marginTop: 4, border: `1px solid ${t.hair}`, background: t.surface2, color: t.ink, borderRadius: 10, padding: "10px 12px", fontSize: 14 }}>
              <option value="">Pilih produk</option>
              {produk.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <Input label="Harga beli/unit" type="number" value={form.hargaBeli} onChange={(v) => setForm((f) => ({ ...f, hargaBeli: v }))} placeholder="0.50" />
            <Input label="Kuantiti" type="number" value={form.qty} onChange={(v) => setForm((f) => ({ ...f, qty: v }))} placeholder="50" />
          </div>
          <div style={{ fontSize: 12.5, color: t.muted }}>Jumlah: <b style={{ color: t.ink }}>{fmt((parseFloat(form.hargaBeli) || 0) * (parseInt(form.qty) || 0))}</b></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: t.muted }}>
            <input type="checkbox" checked={form.updateModal} onChange={(e) => setForm((f) => ({ ...f, updateModal: e.target.checked }))} />
            Kemas kini harga modal produk
          </label>
          <button onClick={submit} className="smTap" style={primaryBtn(t)}>Simpan Restock</button>
        </div>
      </Card>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: t.muted }}>SEJARAH RESTOCK</div>
      {restock.length === 0 && <EmptyState text="Tiada sejarah restock lagi." />}
      {restock.map((r) => (
        <Card key={r.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{r.nama}</span>
            <span style={{ fontSize: 12, color: t.muted }}>{dayLabel(r.tarikh)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>+{r.qty} unit @ {fmt(r.hargaBeli)} — {r.userNama}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.gold, marginTop: 2 }}>{fmt(r.jumlah)}</div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Hutang ---------------- */
function Hutang({ ctx }) {
  const { hutang, setHutang, addLog, showToast, T: t } = ctx;
  const [modal, setModal] = useState(null); // 'new' | hutang id (bayar)
  const [form, setForm] = useState({ nama: "", jumlah: "" });
  const [bayarAmt, setBayarAmt] = useState("");

  const baki = (h) => h.jumlah - (h.bayaran || []).reduce((a, b) => a + b.jumlah, 0);

  const addHutang = () => {
    if (!form.nama || !form.jumlah) return showToast("Lengkapkan nama & jumlah");
    setHutang((h) => [{ id: uid(), nama: form.nama, jumlah: parseFloat(form.jumlah), tarikh: todayStr(), bayaran: [] }, ...h]);
    addLog(`Tambah hutang: ${form.nama} (${fmt(parseFloat(form.jumlah))})`);
    showToast("Hutang ditambah");
    setForm({ nama: "", jumlah: "" });
    setModal(null);
  };

  const bayar = (h) => {
    const amt = parseFloat(bayarAmt);
    if (!amt || amt <= 0) return showToast("Masukkan jumlah bayaran");
    setHutang((arr) => arr.map((x) => (x.id === h.id ? { ...x, bayaran: [...(x.bayaran || []), { jumlah: amt, tarikh: todayStr() }] } : x)));
    addLog(`${h.nama} bayar hutang ${fmt(amt)}`);
    showToast("Bayaran direkod");
    setBayarAmt("");
    setModal(null);
  };

  const sorted = [...hutang].sort((a, b) => baki(b) - baki(a));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => setModal("new")} className="smTap" style={primaryBtn(t)}><Plus size={16} /> Tambah Hutang</button>
      {hutang.length === 0 && <EmptyState text="Tiada rekod hutang." />}
      {sorted.map((h) => {
        const b = baki(h);
        return (
          <Card key={h.id} style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{h.nama}</div>
                <div style={{ fontSize: 11.5, color: t.muted }}>Jumlah asal {fmt(h.jumlah)} · {dayLabel(h.tarikh)}</div>
              </div>
              {b <= 0 ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: t.green, background: t.greenSoft, padding: "3px 10px", borderRadius: 999 }}>Lunas</span>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 800, color: t.red }}>{fmt(b)}</span>
              )}
            </div>
            {b > 0 && (
              <button onClick={() => { setModal(h.id); setBayarAmt(""); }} style={{ marginTop: 8, fontSize: 12.5, background: t.surface2, border: `1px solid ${t.hair}`, color: t.ink, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>+ Tambah Bayaran</button>
            )}
          </Card>
        );
      })}

      {modal === "new" && (
        <BottomSheet onClose={() => setModal(null)} title="Tambah Hutang">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Nama pelanggan" value={form.nama} onChange={(v) => setForm((f) => ({ ...f, nama: v }))} placeholder="cth: Ali" />
            <Input label="Jumlah hutang" type="number" value={form.jumlah} onChange={(v) => setForm((f) => ({ ...f, jumlah: v }))} placeholder="20.00" />
            <button onClick={addHutang} className="smTap" style={primaryBtn(t)}>Simpan</button>
          </div>
        </BottomSheet>
      )}

      {modal && modal !== "new" && (
        <BottomSheet onClose={() => setModal(null)} title="Tambah Bayaran">
          {(() => { const h = hutang.find((x) => x.id === modal); if (!h) return null; return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: t.muted }}>{h.nama} · Baki semasa <b style={{ color: t.red }}>{fmt(baki(h))}</b></div>
              <Input label="Jumlah bayaran" type="number" value={bayarAmt} onChange={setBayarAmt} placeholder="10.00" />
              <button onClick={() => bayar(h)} className="smTap" style={primaryBtn(t)}>Rekod Bayaran</button>
            </div>
          ); })()}
        </BottomSheet>
      )}
    </div>
  );
}

/* ---------------- Laporan ---------------- */
function Laporan({ ctx }) {
  const { jualan, restock, expense, hutang, produk, setExpense, addLog, showToast, currentUser, settings, T: t } = ctx;
  const [period, setPeriod] = useState("harian");
  const [expForm, setExpForm] = useState({ kategori: "", jumlah: "" });
  const [showExpForm, setShowExpForm] = useState(false);

  const inRange = (tarikh) => {
    const d = new Date(tarikh), now = new Date();
    if (period === "harian") return tarikh === todayStr();
    if (period === "mingguan") { const diff = (now - d) / 86400000; return diff >= 0 && diff < 7; }
    if (period === "bulanan") return tarikh.slice(0, 7) === todayStr().slice(0, 7);
    if (period === "tahunan") return tarikh.slice(0, 4) === todayStr().slice(0, 4);
    return true;
  };

  const jFiltered = jualan.filter((j) => inRange(j.tarikh));
  const rFiltered = restock.filter((r) => inRange(r.tarikh));
  const eFiltered = expense.filter((e) => inRange(e.tarikh));

  const untungKasar = jFiltered.reduce((s, j) => s + j.untung, 0);
  const totalJualan = jFiltered.reduce((s, j) => s + j.total, 0);
  const totalPerbelanjaan = eFiltered.reduce((s, e) => s + e.jumlah, 0);
  const untungBersih = untungKasar - totalPerbelanjaan;
  const cashMasuk = totalJualan + hutang.reduce((s, h) => s + (h.bayaran || []).filter((b) => inRange(b.tarikh)).reduce((a, b) => a + b.jumlah, 0), 0);
  const cashKeluar = rFiltered.reduce((s, r) => s + r.jumlah, 0) + totalPerbelanjaan;
  const modal = produk.reduce((s, p) => s + p.hargaModal * p.stok, 0);
  const margin = totalJualan > 0 ? (untungKasar / totalJualan) * 100 : 0;

  const addExpense = () => {
    if (!expForm.kategori || !expForm.jumlah) return showToast("Lengkapkan perbelanjaan");
    setExpense((arr) => [{ id: uid(), tarikh: todayStr(), kategori: expForm.kategori, jumlah: parseFloat(expForm.jumlah), userNama: currentUser.nama }, ...arr]);
    addLog(`Tambah perbelanjaan: ${expForm.kategori} (${fmt(parseFloat(expForm.jumlah))})`);
    setExpForm({ kategori: "", jumlah: "" });
    setShowExpForm(false);
    showToast("Perbelanjaan direkod");
  };

  const [confirmTarget, setConfirmTarget] = useState(null); // { type: "one"|"all", e? }

  const delExpense = (e) => setConfirmTarget({ type: "one", e });

  const resetAllExpense = () => {
    if (expense.length === 0) return showToast("Tiada rekod untuk direset");
    setConfirmTarget({ type: "all" });
  };

  const doConfirm = () => {
    if (confirmTarget.type === "one") {
      const e = confirmTarget.e;
      setExpense((arr) => arr.filter((x) => x.id !== e.id));
      addLog(`Padam perbelanjaan: ${e.kategori} (${fmt(e.jumlah)})`);
      showToast("Rekod dipadam");
    } else if (confirmTarget.type === "all") {
      addLog(`Reset semua rekod perbelanjaan (${expense.length} rekod dipadam)`);
      setExpense([]);
      showToast("Semua perbelanjaan direset");
    }
    setConfirmTarget(null);
  };

  const exportCSV = () => {
    const rows = [["Tarikh", "Masa", "Item", "Kuantiti", "Harga Jual", "Jumlah"]];
    jFiltered.forEach((j) => j.items.forEach((it) => rows.push([j.tarikh, j.masa, it.nama, it.qty, it.hargaJual, it.hargaJual * it.qty])));
    downloadCSV(`laporan-jualan-${period}-${todayStr()}.csv`, rows);
    addLog(`Eksport laporan ${period} (CSV)`);
  };

  const periodLabel = { harian: "Hari Ini", mingguan: "7 Hari Lepas", bulanan: "Bulan Ini", tahunan: "Tahun Ini" };

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {["harian", "mingguan", "bulanan", "tahunan"].map((p) => (
          <button key={p} className="smTap" onClick={() => setPeriod(p)} style={{ whiteSpace: "nowrap", padding: "7px 14px", borderRadius: 999, border: `1px solid ${period === p ? t.gold : t.hair}`, background: period === p ? t.goldSoft : "transparent", color: period === p ? t.gold : t.muted, fontSize: 12.5, fontWeight: 700 }}>
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ fontSize: 12, color: t.muted, fontWeight: 700, marginBottom: 10 }}>PERAKAUNAN AUTOMATIK · {periodLabel[period]}</div>
        <Row label="Jumlah Jualan" value={fmt(totalJualan)} />
        <Row label="Untung Kasar" value={fmt(untungKasar)} color={t.green} />
        <Row label="Perbelanjaan" value={"- " + fmt(totalPerbelanjaan)} color={t.red} />
        <Row label="Untung Bersih" value={fmt(untungBersih)} color={untungBersih >= 0 ? t.green : t.red} bold />
        <Row label="Margin" value={margin.toFixed(1) + "%"} />
        <Row label="Cash Masuk" value={fmt(cashMasuk)} />
        <Row label="Cash Keluar" value={fmt(cashKeluar)} />
        <Row label="Nilai Inventori (Modal)" value={fmt(modal)} last />
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportCSV} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: t.surface2, border: `1px solid ${t.hair}`, color: t.ink, borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <Download size={15} /> Eksport Excel
        </button>
        <button className="smTap" onClick={() => { addLog(`Cetak/simpan PDF laporan ${period}`); setTimeout(() => window.print(), 50); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: t.surface2, border: `1px solid ${t.hair}`, color: t.ink, borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 13 }}>
          <Printer size={15} /> Cetak / Simpan PDF
        </button>
      </div>

      <button className="smTap" onClick={() => setShowExpForm(true)} style={{ ...primaryBtn(t), background: t.surface2, color: t.ink, border: `1px solid ${t.hair}` }}><Plus size={16} /> Tambah Perbelanjaan</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>PERBELANJAAN — {periodLabel[period]}</div>
        {expense.length > 0 && (
          <button className="smTap" onClick={resetAllExpense} style={{ background: "none", border: "none", color: t.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700 }}>
            <Trash2 size={13} /> Reset Semua
          </button>
        )}
      </div>
      {eFiltered.length === 0 && <div style={{ fontSize: 12.5, color: t.muted }}>Tiada perbelanjaan direkod.</div>}
      {eFiltered.map((e) => (
        <Card key={e.id} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 700, fontSize: 13 }}>{e.kategori}</div><div style={{ fontSize: 11, color: t.muted }}>{dayLabel(e.tarikh)} · {e.userNama}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 700, color: t.red }}>{fmt(e.jumlah)}</div>
            <button className="smTap" onClick={() => delExpense(e)} style={{ background: "none", border: "none", color: t.muted, cursor: "pointer", padding: 2, display: "flex" }}><Trash2 size={14} /></button>
          </div>
        </Card>
      ))}

      {showExpForm && (
        <BottomSheet onClose={() => setShowExpForm(false)} title="Tambah Perbelanjaan">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Kategori" value={expForm.kategori} onChange={(v) => setExpForm((f) => ({ ...f, kategori: v }))} placeholder="cth: Sewa gerai" />
            <Input label="Jumlah" type="number" value={expForm.jumlah} onChange={(v) => setExpForm((f) => ({ ...f, jumlah: v }))} placeholder="50.00" />
            <button onClick={addExpense} className="smTap" style={primaryBtn(t)}>Simpan</button>
          </div>
        </BottomSheet>
      )}

      {confirmTarget && (
        <BottomSheet onClose={() => setConfirmTarget(null)} title={confirmTarget.type === "all" ? "Reset Semua Perbelanjaan" : "Padam Rekod"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13.5, color: t.ink, lineHeight: 1.5 }}>
              {confirmTarget.type === "all"
                ? `Padam kekal SEMUA ${expense.length} rekod perbelanjaan? Tindakan ini tidak boleh dibatalkan.`
                : `Padam rekod "${confirmTarget.e.kategori}" (${fmt(confirmTarget.e.jumlah)})? Tindakan ini tidak boleh dibatalkan.`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmTarget(null)} className="smTap" style={{ flex: 1, background: t.surface2, border: `1px solid ${t.hair}`, color: t.ink, borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>Batal</button>
              <button onClick={doConfirm} className="smTap" style={{ flex: 1, background: t.red, border: "none", color: "#fff", borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>Ya, Padam</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>

    {/* Printable report — hidden on screen, shown only when printing/saving as PDF */}
    <div className="print-area" style={{ display: "none", padding: 32, fontFamily: "Arial, sans-serif", color: "#111" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        {settings.logo && <img src={settings.logo} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{settings.namaPerniagaan}</div>
          <div style={{ fontSize: 12, color: "#555" }}>Laporan Perakaunan · {periodLabel[period]} · Dijana {new Date().toLocaleString("ms-MY")}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
        <tbody>
          <PrintRow label="Jumlah Jualan" value={fmt(totalJualan)} />
          <PrintRow label="Untung Kasar" value={fmt(untungKasar)} />
          <PrintRow label="Perbelanjaan" value={"- " + fmt(totalPerbelanjaan)} />
          <PrintRow label="Untung Bersih" value={fmt(untungBersih)} bold />
          <PrintRow label="Margin" value={margin.toFixed(1) + "%"} />
          <PrintRow label="Cash Masuk" value={fmt(cashMasuk)} />
          <PrintRow label="Cash Keluar" value={fmt(cashKeluar)} />
          <PrintRow label="Nilai Inventori (Modal)" value={fmt(modal)} last />
        </tbody>
      </table>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Perbelanjaan — {periodLabel[period]}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #999", textAlign: "left" }}>
            <th style={{ padding: "4px 0" }}>Tarikh</th><th>Kategori</th><th>Pengguna</th><th style={{ textAlign: "right" }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {eFiltered.length === 0 && <tr><td colSpan={4} style={{ padding: "8px 0", color: "#777" }}>Tiada perbelanjaan direkod.</td></tr>}
          {eFiltered.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 0" }}>{dayLabel(e.tarikh)}</td><td>{e.kategori}</td><td>{e.userNama}</td>
              <td style={{ textAlign: "right" }}>{fmt(e.jumlah)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 10.5, color: "#999", marginTop: 24 }}>Dijana automatik oleh {settings.namaPerniagaan} Business Management System.</div>
    </div>
    </>
  );
}

function PrintRow({ label, value, bold, last }) {
  return (
    <tr style={{ borderBottom: last ? "none" : "1px solid #eee" }}>
      <td style={{ padding: "6px 0", color: "#555" }}>{label}</td>
      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: bold ? 800 : 600 }}>{value}</td>
    </tr>
  );
}

function Row({ label, value, color, bold, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: last ? "none" : `1px solid ${T.hair}` }}>
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: bold ? 800 : 700, color: color || T.ink }}>{value}</span>
    </div>
  );
}

/* ---------------- Top Pembeli (leaderboard) ---------------- */
function TopPembeli({ ctx }) {
  const { jualan, T: t } = ctx;
  const [q, setQ] = useState("");

  const ranked = useMemo(() => {
    const map = {};
    jualan.forEach((j) => {
      const nama = (j.pembeli || "Tanpa Nama").trim() || "Tanpa Nama";
      const key = nama.toLowerCase();
      if (!map[key]) map[key] = { nama, total: 0, kali: 0, lastTarikh: j.tarikh };
      map[key].total += j.total;
      map[key].kali += 1;
      if (j.tarikh > map[key].lastTarikh) map[key].lastTarikh = j.tarikh;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [jualan]);

  const filtered = ranked.filter((r) => r.nama.toLowerCase().includes(q.toLowerCase()));
  const medal = ["🥇", "🥈", "🥉"];

  if (jualan.length === 0) return <EmptyState text="Belum ada jualan lagi untuk dipaparkan." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>Ranking ikut jumlah perbelanjaan keseluruhan</div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama pembeli..." style={{ border: `1px solid ${t.hair}`, background: t.surface2, color: t.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, outline: "none" }} />

      {filtered.map((r, i) => {
        const rank = ranked.indexOf(r);
        return (
          <Card key={r.nama} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
            <div style={{ width: 34, textAlign: "center", fontSize: rank < 3 ? 20 : 13, fontWeight: 800, color: rank < 3 ? undefined : t.muted, flexShrink: 0 }}>
              {rank < 3 ? medal[rank] : `#${rank + 1}`}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: t.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: t.gold, flexShrink: 0 }}>
              {r.nama[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.nama}</div>
              <div style={{ fontSize: 11.5, color: t.muted }}>{r.kali}x beli · kali terakhir {dayLabel(r.lastTarikh)}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.gold, whiteSpace: "nowrap" }}>{fmt(r.total)}</div>
          </Card>
        );
      })}
      {filtered.length === 0 && <EmptyState text={`Tiada pembeli sepadan "${q}"`} />}
    </div>
  );
}

/* ---------------- Activity Log ---------------- */
function ActivityLog({ ctx }) {
  const { log, T: t } = ctx;
  const [q, setQ] = useState("");
  const filtered = log.filter((l) => (l.aksi + l.userNama).toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktiviti..." style={{ border: `1px solid ${t.hair}`, background: t.surface2, color: t.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, outline: "none" }} />
      {filtered.length === 0 && <EmptyState text="Tiada aktiviti direkod." />}
      {filtered.map((l) => (
        <Card key={l.id} style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Activity size={15} color={t.gold} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13 }}><b>{l.userNama}</b> {l.aksi}</div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>{new Date(l.masa).toLocaleString("ms-MY")}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsTab({ ctx }) {
  const { settings, setSettings, users, setUsers, addLog, showToast, T: t, jualan, setJualan, restock, setRestock, hutang, setHutang, expense, setExpense } = ctx;
  const [nama, setNama] = useState(settings.namaPerniagaan);
  const [modal, setModal] = useState(null); // 'new' user | 'resetAkaun'
  const [uform, setUform] = useState({ nama: "", role: "Pekerja", pin: "" });
  const logoRef = useRef();

  const totalRekod = jualan.length + restock.length + hutang.length + expense.length;

  const resetPerakaunan = () => {
    setJualan([]);
    setRestock([]);
    setHutang([]);
    setExpense([]);
    addLog(`Reset Perakaunan: padam ${totalRekod} rekod (Jualan, Restock, Hutang, Perbelanjaan) — Stok produk dikekalkan`);
    showToast("Perakaunan direset");
    setModal(null);
  };

  const saveName = () => { setSettings((s) => ({ ...s, namaPerniagaan: nama })); addLog("Kemas kini nama perniagaan"); showToast("Disimpan"); };

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await resizeImage(file, 160, 0.7);
      setSettings((s) => ({ ...s, logo: b64 }));
      addLog("Kemas kini logo kedai");
      showToast("Logo dikemas kini");
    } catch (err) { showToast("Gagal upload logo"); }
  };

  const addUser = () => {
    if (!uform.nama || uform.pin.length !== 4) return showToast("Nama & PIN 4-digit diperlukan");
    setUsers((u) => [...u, { id: uid(), nama: uform.nama, role: uform.role, pin: uform.pin }]);
    addLog(`Tambah pengguna: ${uform.nama} (${uform.role})`);
    showToast("Pengguna ditambah");
    setUform({ nama: "", role: "Pekerja", pin: "" });
    setModal(null);
  };

  const delUser = (u) => { if (users.length <= 1) return showToast("Kena ada sekurang-kurangnya 1 pengguna"); setUsers((arr) => arr.filter((x) => x.id !== u.id)); addLog(`Padam pengguna: ${u.nama}`); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 12, color: t.muted, fontWeight: 700, marginBottom: 10 }}>LOGO KEDAI</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => logoRef.current.click()} style={{ width: 64, height: 64, borderRadius: 14, background: t.surface2, border: `1px dashed ${t.hair}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
            {settings.logo ? <img src={settings.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImagePlus size={22} color={t.muted} />}
          </button>
          <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
          <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5 }}>
            Logo akan muncul kat header app & skrin login.<br />Tap gambar untuk tukar.
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: t.muted, fontWeight: 700, marginBottom: 10 }}>NAMA PERNIAGAAN</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={nama} onChange={(e) => setNama(e.target.value)} style={{ flex: 1, border: `1px solid ${t.hair}`, background: t.surface2, color: t.ink, borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
          <button onClick={saveName} style={{ background: t.gold, border: "none", color: "#141414", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}><Check size={16} /></button>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>PENGGUNA</div>
        <button onClick={() => setModal("new")} style={{ background: "none", border: "none", color: t.gold, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700 }}><Plus size={14} /> Tambah</button>
      </div>
      {users.map((u) => (
        <Card key={u.id} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nama}</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>{u.role} · PIN {u.pin}</div>
          </div>
          <button onClick={() => delUser(u)} style={{ background: "none", border: "none", color: t.red, cursor: "pointer" }}><Trash2 size={16} /></button>
        </Card>
      ))}

      {modal === "new" && (
        <BottomSheet onClose={() => setModal(null)} title="Tambah Pengguna">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Nama" value={uform.nama} onChange={(v) => setUform((f) => ({ ...f, nama: v }))} placeholder="cth: Faiz" />
            <label style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>Peranan
              <select value={uform.role} onChange={(e) => setUform((f) => ({ ...f, role: e.target.value }))} style={{ width: "100%", marginTop: 4, border: `1px solid ${t.hair}`, background: t.surface2, color: t.ink, borderRadius: 10, padding: "10px 12px" }}>
                <option>Pekerja</option><option>Admin</option>
              </select>
            </label>
            <Input label="PIN 4-digit" value={uform.pin} onChange={(v) => setUform((f) => ({ ...f, pin: v.replace(/\D/g, "").slice(0, 4) }))} placeholder="1234" />
            <button onClick={addUser} className="smTap" style={primaryBtn(t)}>Simpan</button>
          </div>
        </BottomSheet>
      )}

      <div style={{ fontSize: 12, color: t.red, fontWeight: 700, marginTop: 8 }}>ZON BAHAYA</div>
      <Card style={{ border: `1px solid ${t.red}55` }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Reset Perakaunan</div>
        <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 12 }}>
          Padam kekal semua rekod <b>Jualan, Restock, Hutang & Perbelanjaan</b> ({totalRekod} rekod). Senarai produk & stok kekal seperti biasa. Tindakan ini tidak boleh dibatalkan.
        </div>
        <button
          className="smTap"
          onClick={() => setModal("resetAkaun")}
          disabled={totalRekod === 0}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: totalRekod === 0 ? t.surface2 : "rgba(229,83,75,0.12)", border: `1px solid ${t.red}`, color: t.red, borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 13, cursor: totalRekod === 0 ? "not-allowed" : "pointer", opacity: totalRekod === 0 ? 0.5 : 1 }}
        >
          <Trash2 size={15} /> Reset Perakaunan
        </button>
      </Card>

      {modal === "resetAkaun" && (
        <BottomSheet onClose={() => setModal(null)} title="Sahkan Reset Perakaunan">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13.5, color: t.ink, lineHeight: 1.5 }}>
              Kau akan padam kekal <b>{jualan.length}</b> jualan, <b>{restock.length}</b> restock, <b>{hutang.length}</b> hutang, dan <b>{expense.length}</b> perbelanjaan. Stok produk tidak terjejas. Tindakan ini <b>tidak boleh dibatalkan</b>.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} className="smTap" style={{ flex: 1, background: t.surface2, border: `1px solid ${t.hair}`, color: t.ink, borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>Batal</button>
              <button onClick={resetPerakaunan} className="smTap" style={{ flex: 1, background: t.red, border: "none", color: "#fff", borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>Ya, Reset</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/* ---------------- Drawer / Search / Notif / QuickActions ---------------- */
function Drawer({ ctx, tab, setTab, onClose, onLogout }) {
  const { isAdmin, T: t } = ctx;
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "pos", label: "POS", icon: ShoppingCart },
    { id: "inventori", label: "Inventori", icon: Package },
    { id: "restock", label: "Restock", icon: Receipt },
    { id: "hutang", label: "Hutang", icon: Wallet },
    { id: "laporan", label: "Laporan", icon: FileText },
    { id: "toppembeli", label: "Top Pembeli", icon: TrendingUp },
    ...(isAdmin ? [{ id: "log", label: "Log Aktiviti", icon: Activity }, { id: "settings", label: "Settings", icon: SettingsIcon }] : []),
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 100, animation: "smFadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 12, top: 12, bottom: 12, width: 240, background: "rgba(28,29,32,0.82)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.4)", animation: "smSheetUp 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 18 }}>{ctx.settings.namaPerniagaan}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {items.map((it) => (
            <button key={it.id} className="smTap" onClick={() => { setTab(it.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, background: tab === it.id ? T.goldSoft : "transparent", border: "none", color: tab === it.id ? T.gold : T.ink, fontSize: 13.5, fontWeight: tab === it.id ? 700 : 500, textAlign: "left" }}>
              <it.icon size={17} /> {it.label}
            </button>
          ))}
        </div>
        <button className="smTap" onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "rgba(229,83,75,0.08)", border: "1px solid rgba(229,83,75,0.25)", borderRadius: 12, color: T.red, fontSize: 13.5, fontWeight: 700 }}>
          <LogOut size={16} /> Log Keluar
        </button>
      </div>
    </div>
  );
}

function SearchOverlay({ ctx, setTab, onClose }) {
  const { produk, hutang, T: t } = ctx;
  const [q, setQ] = useState("");
  const results = q.length > 0 ? [
    ...produk.filter((p) => p.nama.toLowerCase().includes(q.toLowerCase())).map((p) => ({ type: "Produk", label: p.nama, sub: fmt(p.hargaJual), go: "inventori" })),
    ...hutang.filter((h) => h.nama.toLowerCase().includes(q.toLowerCase())).map((h) => ({ type: "Hutang", label: h.nama, sub: fmt(h.jumlah), go: "hutang" })),
  ] : [];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,12,13,0.6)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", zIndex: 100, padding: 16, display: "flex", flexDirection: "column", animation: "smFadeIn 0.2s ease" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk, hutang..." style={{ flex: 1, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: t.ink, borderRadius: 12, padding: "12px 14px", fontSize: 14, outline: "none" }} />
        <button className="smTap" onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 999, width: 36, height: 36, color: t.ink }}><X size={20} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((r, i) => (
          <button key={i} className="smTap" onClick={() => { setTab(r.go); onClose(); }} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", color: t.ink, textAlign: "left" }}>
            <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.label}</div><div style={{ fontSize: 11, color: t.muted }}>{r.type}</div></div>
            <div style={{ fontSize: 13, color: t.gold, fontWeight: 700 }}>{r.sub}</div>
          </button>
        ))}
        {q.length > 0 && results.length === 0 && <div style={{ color: t.muted, fontSize: 13, textAlign: "center", marginTop: 20 }}>Tiada hasil untuk "{q}"</div>}
      </div>
    </div>
  );
}

function NotifOverlay({ notifs, onDismiss, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 100, display: "flex", justifyContent: "center", animation: "smFadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 70, right: 16, width: 280, background: "rgba(28,29,32,0.82)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, padding: 12, maxHeight: "60vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.4)", animation: "smSheetUp 0.22s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Notifikasi</div>
        {notifs.length === 0 && <div style={{ fontSize: 12.5, color: T.muted, padding: "8px 0" }}>Tiada notifikasi baharu.</div>}
        {notifs.map((n) => (
          <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><AlertTriangle size={14} color={T.gold} /><span style={{ fontSize: 12.5 }}>{n.text}</span></div>
            <button className="smTap" onClick={() => onDismiss(n.id)} style={{ background: "none", border: "none", color: T.muted }}><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ ctx, setTab, onClose }) {
  const { isAdmin, T: t } = ctx;
  const actions = [
    { label: "Tambah Produk", icon: Package, go: "inventori" },
    { label: "Rekod Jualan", icon: ShoppingCart, go: "pos" },
    { label: "Tambah Hutang", icon: Wallet, go: "hutang" },
    { label: "Tambah Perbelanjaan", icon: FileText, go: "laporan" },
    { label: "Restock", icon: Receipt, go: "restock" },
    ...(isAdmin ? [{ label: "Tambah Pengguna", icon: Users, go: "settings" }] : []),
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14, animation: "smFadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "rgba(28,29,32,0.78)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.09)", width: "100%", maxWidth: 440, borderRadius: 26, padding: 20, paddingBottom: 24, marginBottom: 76, boxShadow: "0 24px 60px rgba(0,0,0,0.45)", animation: "smSheetUp 0.28s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, fontFamily: "'Sora',sans-serif" }}>Tindakan Pantas</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {actions.map((a) => (
            <button key={a.label} className="smTap" onClick={() => { setTab(a.go); onClose(); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, color: T.ink }}>
              <a.icon size={20} color={T.gold} />
              <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center" }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
