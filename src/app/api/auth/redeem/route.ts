import { redeemCode } from "@/lib/subscription";

export async function POST(request: Request) {
  const anonUserId = request.headers.get("x-anon-user-id");
  if (!anonUserId) {
    return Response.json(
      { success: false, message: "无法识别设备，请刷新页面后重试" },
      { status: 400 }
    );
  }

  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, message: "请求格式错误" },
      { status: 400 }
    );
  }

  if (!body.code || typeof body.code !== "string") {
    return Response.json(
      { success: false, message: "请输入兑换码" },
      { status: 400 }
    );
  }

  const result = await redeemCode(anonUserId, body.code);
  const status = result.success ? 200 : 400;
  return Response.json(result, { status });
}
