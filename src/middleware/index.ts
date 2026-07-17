import { defineMiddleware } from "astro:middleware";
import { findSession } from "@/lib/security/session";
import { findByUsername } from "@/lib/repositories/userRepo";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const sessionId = context.cookies.get("session_id")?.value;

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ["/login", "/api/auth/login"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isPublicRoute) {
    return next();
  }

  // Si no hay sesión, redirigir a login
  if (!sessionId) {
    return context.redirect("/login");
  }

  // Buscar sesión válida
  const session = await findSession(sessionId);

  if (!session) {
    context.cookies.delete("session_id", { path: "/" });
    return context.redirect("/login");
  }

  // Cargar usuario (optimización: cachear en memoria si es necesario)
  // Por ahora, consultamos la BD cada vez (puede optimizarse después)
  // Necesitamos una función que busque por ID, no por username
  // Por ahora, simplificamos: solo verificamos que la sesión existe

  // Cargar datos básicos del usuario en locals
  // (En el punto 3 completaremos esto con una función findByUserId)
  context.locals.session = {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt,
  };

  // Por ahora, no cargamos el usuario completo (viene en el punto 3)
  // context.locals.user = ...

  return next();

});
