import { supabase } from "./_supabase";

export default async function handler(req, res) {
  const fid = Number(req.query.fid);

  const { data, error } = await supabase
    .from("whitelist")
    .select("fid")
    .eq("fid", fid)
    .maybeSingle();

  res.status(200).json({
    whitelisted: Boolean(data),
  });
}
