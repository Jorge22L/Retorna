import type { APIContext } from "astro";
import { login } from "@/lib/services/authService";
import { revokeSession } from "@/lib/security/session";
import { error } from "node:console";

export async function POST(context: APIContext): Promise<Response> {
  console.log("🔵 [LOGIN] Petición POST recibida");
  const { request, redirect, cookies } = context;

  let username: string | undefined;
  let password: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";
  console.log("🔵 [LOGIN] Content-Type:", contentType);

  try {
    if (contentType.includes("application/json")) {
      username = body.username;
      password = body.password;
    } else {
      const form = await request.formData();
      username = form.get("username")?.toString();
      password = form.get("password")?.toString();
      console.log("🔵 [LOGIN] Datos del formulario:", {
        username,
        password: password ? "***" : undefined,
      });
    }
  } catch (err) {
    console.error("🔴 [LOGIN] Error al parsear la petición:", err);
    return new Response(JSON.stringify({ error: "Solicitud no válida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  // @TODO: Revisar
  // Invalidar sesiones anteriores del mismo usuario (opcional, mejora de seguridad)
  await db.execute({
    sql: `UPDATE sessions SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0`,
    args: [user.id],
  });

  console.log("🔵 [LOGIN] Llamando al servicio de login...");
  const result = await login({ username, password }, { ipAddress, userAgent });
  console.log(
    "🔵 [LOGIN] Resultado del servicio:",
    result.success ? "Éxito" : `Fallo: ${result.reason}`,
  );

  if (!result.success) {
    console.log("🟡 [LOGIN] Redirigiendo con error:", result.reason);
    return redirect(`/login?error=${result.reason}`, 303);
  }

  console.log("🟢 [LOGIN] Configurando cookie de sesión...");
  const isProd = import.meta.env.PROD;
  cookies.set("session_id", result.session.id, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: result.session.expiresAt,
  });

  console.log("🟢 [LOGIN] Redirigiendo a /");
  return redirect("/", 303);
}
