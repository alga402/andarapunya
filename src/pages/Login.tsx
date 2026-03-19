import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const navigate = useNavigate();

  const handleAuth = async () => {
    if (!email || !password) return alert("Isi semua field!");

    // =====================
    // REGISTER
    // =====================
    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return alert(error.message);

      // 🔥 MASUKIN KE TABLE WORKER
      await supabase.from("worker").insert([
        {
          email: email,
          name: email.split("@")[0],
          role: "worker",
          status: "active",
        },
      ]);

      alert("Register berhasil!");
      setIsRegister(false);
      return;
    }

    // =====================
    // LOGIN
    // =====================
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return alert("Login gagal");

    // 🔍 CEK ROLE
    const { data: userData } = await supabase
      .from("worker")
      .select("*")
      .eq("email", email)
      .single();

    if (!userData) return alert("User tidak ditemukan");

    if (userData.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/worker");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-800 p-6 rounded-xl w-80 space-y-4">
        <h2 className="text-xl font-bold text-center">
          {isRegister ? "Register" : "Login"}
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 text-black rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 text-black rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleAuth}
          className="w-full bg-purple-500 py-2 rounded"
        >
          {isRegister ? "Register" : "Login"}
        </button>

        <p
          className="text-sm text-center cursor-pointer"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister
            ? "Sudah punya akun? Login"
            : "Belum punya akun? Register"}
        </p>
      </div>
    </div>
  );
}