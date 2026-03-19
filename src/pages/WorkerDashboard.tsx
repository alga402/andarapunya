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

export default function WorkerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [goldInput, setGoldInput] = useState("");
  const [notif, setNotif] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, []);

  // =====================
  // REALTIME LISTENER 🔥
  // =====================
  useEffect(() => {
    const channel = supabase
      .channel("realtime-worker")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          setNotif("🔥 Update status terbaru!");
          init();
          setTimeout(() => setNotif(""), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: u } = await supabase
      .from("worker")
      .select("*")
      .eq("email", user?.email)
      .single();

    setUser(u);

    const [t, s, a, h] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", u.id),
      supabase.from("settings").select("*").single(),
      supabase.from("accounts").select("*").eq("holder", u.name),
      supabase.from("salary_history").select("*").eq("worker_id", u.id),
    ]);

    setTransactions(t.data || []);
    setSettings(s.data);
    setAccounts(a.data || []);
    setHistory(h.data || []);
  };

  // =====================
  // INPUT GOLD
  // =====================
  const submitGold = async () => {
    if (!goldInput) return alert("Isi gold dulu");

    await supabase.from("transactions").insert([
      {
        user_id: user.id,
        gold: Number(goldInput),
        status: "pending",
      },
    ]);

    setGoldInput("");
  };

  // =====================
  // HITUNG
  // =====================
  const paidTx = transactions.filter((t) => t.status === "paid");

  const totalGold = paidTx.reduce(
    (a, b) => a + Number(b.gold || 0),
    0
  );

  const percent =
    totalGold >= (settings?.target_gold || 0) ? 0.6 : 0.5;

  const salary = totalGold * (settings?.gold_rate || 0) * percent;

  const isTarget = totalGold >= (settings?.target_gold || 0);

  // =====================
  // STATUS STYLE
  // =====================
  const statusStyle = (s: string) => {
    switch (s) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-blue-500";
      case "selling":
        return "bg-purple-500";
      case "paid":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // =====================
  // COUNTDOWN
  // =====================
  const getRemaining = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) return "Expired ❌";
    return `${days} hari`;
  };

  // =====================
  // CHART
  // =====================
  const chartData = transactions.map((t) => ({
    date: new Date(t.created_at).toLocaleDateString(),
    gold: Number(t.gold),
  }));

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6 space-y-6">

      {/* NOTIF 🔥 */}
      {notif && (
        <div className="bg-green-500 text-black p-2 rounded text-center animate-pulse">
          {notif}
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-purple-400">
          👤 {user?.name}
        </h1>

        <button
          onClick={handleLogout}
          className="bg-red-500 px-3 py-1 rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* INPUT */}
      <div className="bg-gray-800 p-4 rounded-xl flex gap-2">
        <input
          type="number"
          placeholder="Input Gold"
          value={goldInput}
          onChange={(e) => setGoldInput(e.target.value)}
          className="p-2 text-black flex-1 rounded"
        />

        <button
          onClick={submitGold}
          className="bg-green-500 px-4 rounded hover:scale-105 transition"
        >
          Submit
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl">
          <p>Total Gold</p>
          <h2 className="text-yellow-400 text-2xl">
            {totalGold.toLocaleString()}
          </h2>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <p>Estimasi Gaji</p>
          <h2 className="text-green-400 text-2xl">
            Rp {Math.floor(salary).toLocaleString("id-ID")}
          </h2>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <p>Status</p>
          <h2 className={isTarget ? "text-green-400" : "text-yellow-400"}>
            {isTarget ? "Target 🔥" : "Belum"}
          </h2>
        </div>
      </div>

      {/* TRANSAKSI */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="mb-2 font-semibold">📦 Status Gold</h2>

        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex justify-between items-center border-b py-2"
          >
            <div>
              <p>{t.gold} gold</p>
              <span
                className={`${statusStyle(
                  t.status
                )} px-2 py-1 text-xs rounded`}
              >
                {t.status}
              </span>
            </div>

            <p className="text-xs text-gray-400">
              {new Date(t.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className="bg-gray-800 p-4 rounded-xl h-64">
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="gold" stroke="#00f7ff" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* GAMETIME */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2>⏳ Akun</h2>

        {accounts.map((a) => (
          <div key={a.id} className="border-b py-2">
            <p>{a.email}</p>
            <p className="text-sm">{getRemaining(a.expired_at)}</p>
          </div>
        ))}
      </div>

      {/* HISTORY */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2>🧾 History</h2>

        {history.map((h) => (
          <div key={h.id} className="border-b py-2">
            <p>{h.total_gold} gold</p>
            <p>Rp {Number(h.salary).toLocaleString("id-ID")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}