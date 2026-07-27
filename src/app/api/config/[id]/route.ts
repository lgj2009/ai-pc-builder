import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("saved_configs")
    .select("*")
    .or(`id.eq.${id},share_token.eq.${id}`)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "NOT_FOUND", message: "配置单不存在" },
      { status: 404 }
    );
  }

  return Response.json(data);
}
