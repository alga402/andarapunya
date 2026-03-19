import { supabase } from "../lib/supabase";

export async function register(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("User tidak ditemukan");

  const { error: dbError } = await supabase.from("worker").insert([
    {
      id: user.id,
      name,
      email,
      role: "worker",
      status: "active",
    },
  ]);

  if (dbError) throw dbError;

  return user;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data.user;
}

export async function logout() {
  await supabase.auth.signOut();
}