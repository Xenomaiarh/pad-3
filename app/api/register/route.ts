export async function POST(req) {
    try {
        console.log("REGISTER API HIT");

        const body = await req.json();

        const res = await fetch(`${process.env.AUTH_SERVICE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const result = await res.json();

        // Проброс статуса назад в фронт
        return new Response(JSON.stringify(result), {
            status: res.status,
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Register API proxy error:", err);
        return new Response(
            JSON.stringify({ message: "Internal Server Error" }),
            { status: 500 }
        );
    }
}

