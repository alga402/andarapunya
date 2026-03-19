import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logout } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [w, t, a, h, s] = await Promise.all([
      supabase.from("worker").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("accounts").select("*"),
      supabase.from("salary_history").select("*"),
      supabase.from("settings").select("*").single(),
    ]);

    setWorkers(w.data || []);
    setTransactions(t.data || []);
    setAccounts(a.data || []);
    setHistory(h.data || []);
    setSettings(s.data);

    setLoading(false);
  };

  // =====================
  // FORMAT RP 🔥
  // =====================
  const formatRp = (num: number) => {
    return "Rp " + num.toLocaleString("id-ID");
  };

  // =====================
  // FILTER
  // =====================
  const filteredWorkers = workers.filter((w) =>
    w.name?.toLowerCase().includes(search.toLowerCase())
  );

  // =====================
  // UPDATE STATUS
  // =====================
  const updateStatus = async (id: string, status: string) => {
    if (status === "paid") {
      const sell = Number(prompt("Harga jual per gold") || 0);

      await supabase
        .from("transactions")
        .update({ status: "paid", sell_price: sell })
        .eq("id", id);
    } else {
      await supabase.from("transactions").update({ status }).eq("id", id);
    }

    fetchData();
  };

  // =====================
  // GAJI
  // =====================
  const calculateSalary = (id: string) => {
    if (!settings) return { total: 0, salary: 0 };

    const tx = transactions.filter(
      (t) => t.user_id === id && t.status === "paid"
    );

    const total = tx.reduce((a, b) => a + Number(b.gold || 0), 0);

    const percent =
      total >= settings.target_gold ? 0.6 : 0.5;

    const salary = total * settings.gold_rate * percent;

    return { total, salary };
  };

  // =====================
  // GLOBAL
  // =====================
  const calculateGlobal = () => {
    if (!settings) return { gold: 0, salary: 0, profit: 0 };

    let totalGold = 0;
    let totalSalary = 0;
    let totalRevenue = 0;

    workers.forEach((w) => {
      const tx = transactions.filter(
        (t) => t.user_id === w.id && t.status === "paid"
      );

      const gold = tx.reduce((a, b) => a + Number(b.gold || 0), 0);

      const percent =
        gold >= settings.target_gold ? 0.6 : 0.5;

      const salary = gold * settings.gold_rate * percent;

      const revenue = tx.reduce(
        (a, b) =>
          a + Number(b.gold || 0) * Number(b.sell_price || 0),
        0
      );

      totalGold += gold;
      totalSalary += salary;
      totalRevenue += revenue;
    });

    return {
      gold: totalGold,
      salary: totalSalary,
      profit: totalRevenue - totalSalary,
    };
  };

  // =====================
  // PER WORKER
  // =====================
  const calculateWorkerProfit = (id: string) => {
    if (!settings) return { gold: 0, salary: 0, profit: 0 };

    const tx = transactions.filter(
      (t) => t.user_id === id && t.status === "paid"
    );

    const totalGold = tx.reduce((a, b) => a + Number(b.gold || 0), 0);

    const percent =
      totalGold >= settings.target_gold ? 0.6 : 0.5;

    const salary = totalGold * settings.gold_rate * percent;

    const revenue = tx.reduce(
      (a, b) =>
        a + Number(b.gold || 0) * Number(b.sell_price || 0),
      0
    );

    return {
      gold: totalGold,
      salary,
      profit: revenue - salary,
    };
  };

  // =====================
  // SAVE HISTORY
  // =====================
  const saveHistory = async (w: any) => {
    const s = calculateSalary(w.id);

    await supabase.from("salary_history").insert([
      {
        worker_id: w.id,
        total_gold: s.total,
        salary: s.salary,
      },
    ]);

    fetchData();
  };

  // =====================
  // SETTINGS
  // =====================
  const saveSettings = async () => {
    await supabase.from("settings").update(settings).eq("id", 1);
    fetchData();
  };

  // =====================
  // WA
  // =====================
  const sendWA = (w: any) => {
    const cut = Number(prompt("Potongan") || 0);
    const s = calculateSalary(w.id);
    const final = s.salary - cut;

    const msg = `📊 LAPORAN GAJI

Nama: ${w.name}
Total Gold: ${s.total}

Gaji Kotor: ${formatRp(s.salary)}
Potongan: ${formatRp(cut)}

💰 Gaji Bersih: ${formatRp(final)}

Terima kasih 🙌`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  const global = calculateGlobal();

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-3xl text-purple-400 font-bold">
          Admin Dashboard
        </h1>

        <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
          Logout
        </button>
      </div>

      {/* GLOBAL */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <p>Total Gold</p>
          <h2 className="text-yellow-400">{global.gold}</h2>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <p>Total Gaji</p>
          <h2 className="text-green-400">{formatRp(global.salary)}</h2>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <p>Profit</p>
          <h2 className={global.profit >= 0 ? "text-green-400" : "text-red-400"}>
            {formatRp(global.profit)}
          </h2>
        </div>
      </div>

      {/* TOGGLE FIX 🔥 */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowSettings((v) => !v)} className="bg-yellow-500 px-3 py-1 rounded">
          Settings
        </button>
        <button onClick={() => setShowAccounts((v) => !v)} className="bg-blue-500 px-3 py-1 rounded">
          Accounts
        </button>
        <button onClick={() => setShowHistory((v) => !v)} className="bg-green-500 px-3 py-1 rounded">
          History
        </button>
      </div>

      {/* SETTINGS */}
      {showSettings && settings && (
        <div className="bg-gray-800 p-4 rounded">
          <input
            type="number"
            className="text-black p-2 mr-2"
            value={settings.gold_rate}
            onChange={(e) =>
              setSettings({ ...settings, gold_rate: Number(e.target.value) })
            }
          />
          <input
            type="number"
            className="text-black p-2 mr-2"
            value={settings.target_gold}
            onChange={(e) =>
              setSettings({ ...settings, target_gold: Number(e.target.value) })
            }
          />
          <button onClick={saveSettings} className="bg-green-500 px-3 py-1">
            Save
          </button>
        </div>
      )}

{showAccounts && (
  <div className="bg-gray-800 p-4 rounded">
    <button
      onClick={async () => {
        const email = prompt("Email akun");
        if (!email) return;

        const holder = prompt("Pemegang");
        const expired = prompt("Expired (YYYY-MM-DD)");
        if (!expired) return;

        await supabase.from("accounts").insert([
          { email, holder, expired_at: expired },
        ]);

        fetchData();
      }}
      className="bg-green-500 px-3 py-1 mb-3 rounded"
    >
      + Tambah Akun
    </button>

    {accounts.length === 0 && <p>Tidak ada akun</p>}

    {accounts.map((a) => (
      <div key={a.id} className="flex justify-between border-b py-2">
        <div>
          <p>{a.email}</p>
          <p className="text-sm text-gray-400">{a.holder}</p>
          <p className="text-xs">
            Exp:{" "}
            {Math.ceil(
              (new Date(a.expired_at).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )}{" "}
            hari
          </p>
        </div>

        <button
          onClick={async () => {
            await supabase.from("accounts").delete().eq("id", a.id);
            fetchData();
          }}
          className="bg-red-500 px-2 rounded"
        >
          Hapus
        </button>
      </div>
    ))}
  </div>
)}

{showHistory && (
  <div className="bg-gray-800 p-4 rounded">
    <h2 className="mb-2 font-semibold">History Gaji</h2>

    {history.length === 0 && <p>Belum ada data</p>}

    {history.map((h) => (
      <div key={h.id} className="border-b py-2">
        <p>Worker ID: {h.worker_id}</p>
        <p>Total Gold: {h.total_gold}</p>
        <p>Gaji: Rp {h.salary.toLocaleString("id-ID")}</p>
        <p className="text-xs text-gray-400">
          {new Date(h.created_at).toLocaleString()}
        </p>
      </div>
    ))}
  </div>
)}

      {/* SEARCH */}
      <input
        placeholder="Search worker..."
        className="p-2 text-black"
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* WORKER */}
      {filteredWorkers.map((w) => {
        const workerTx = transactions.filter((t) => t.user_id === w.id);
        const p = calculateWorkerProfit(w.id);

        return (
          <div key={w.id} className="bg-gray-800 p-4 rounded space-y-2">
            <p className="font-bold">{w.name}</p>

            <div className="text-sm">
              <p>Total Gold: {p.gold}</p>
              <p>Gaji: {formatRp(p.salary)}</p>
              <p className={p.profit >= 0 ? "text-green-400" : "text-red-400"}>
                Profit: {formatRp(p.profit)}
              </p>
            </div>

            {workerTx.map((t) => (
              <div key={t.id} className="bg-gray-700 p-2 rounded flex justify-between">
                <div>
                  <p>{t.gold} gold</p>
                  <p className="text-xs">{t.status}</p>
                </div>

                <div className="flex gap-1">
                  {t.status === "pending" && (
                    <button onClick={() => updateStatus(t.id, "approved")} className="bg-yellow-500 px-2 text-xs">
                      Approve
                    </button>
                  )}
                  {t.status === "approved" && (
                    <button onClick={() => updateStatus(t.id, "selling")} className="bg-blue-500 px-2 text-xs">
                      Jual
                    </button>
                  )}
                  {t.status === "selling" && (
                    <button onClick={() => updateStatus(t.id, "paid")} className="bg-green-500 px-2 text-xs">
                      Cair
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <button onClick={() => saveHistory(w)} className="bg-green-500 px-2">
                Save
              </button>
              <button onClick={() => sendWA(w)} className="bg-blue-500 px-2">
                WA
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}