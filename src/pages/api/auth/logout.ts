import type { APIContext } from "astro";
import { logout } from "@/lib/services/authService";

export async function POST(context: APIContext): Promise<Response>{
    const { redirect, cookies, locals } = context;

    const sessionId = cookies.get('session_id')?.value;
    if(sessionId && locals.user){
        const ipAddress = 
            context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? context.request.headers.get('x-real-ip') ?? 'unknown';
        const userAgent = context.request.headers.get('user-agent') ?? 'unknown';
        
        await logout(sessionId, locals.user.id, { ipAddress, userAgent });
    }

    cookies.delete('session_id',{
        path: '/',
    });

    return redirect('/login', 303);
}