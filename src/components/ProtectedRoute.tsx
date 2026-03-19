import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  role,
}: {
  children: any;
  role: "admin" | "worker";
}) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("worker")
      .select("*")
      .eq("email", user.email)
      .single();

    if (data && data.role === role) {
      setAllowed(true);
    } else {
      setAllowed(false);
    }

    setLoading(false);
  };

  if (loading) return <div className="text-white p-10">Loading...</div>;

  if (!allowed) return <Navigate to="/" />;

  return children;
}