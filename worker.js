const SUPABASE_URL = "https://lkusqqljnkfmtwfhxfy.supabase.co";
const SUPABASE_KEY = "sb_publishable_xYzPsObMWkWGEpqgAqSOdQ_QIruUZBc";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/pedido") {
      if (request.method !== "POST") {
        return json({ error: "Método não permitido." }, 405);
      }

      let body;
      try {
        body = await request.json();
      } catch (_) {
        return json({ error: "Dados do pedido inválidos." }, 400);
      }

      const pedido = body?.pedido;
      const itens = Array.isArray(body?.itens) ? body.itens : [];

      if (!pedido || !itens.length) {
        return json({ error: "Pedido sem dados ou sem itens." }, 400);
      }

      const headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation",
        "Content-Profile": "public"
      };

      try {
        const orderRes = await fetch(
          `${SUPABASE_URL}/rest/v1/pedidos`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(pedido)
          }
        );

        const orderText = await orderRes.text();

        let orderJson = null;
        try {
          orderJson = JSON.parse(orderText);
        } catch (_) {}

        if (!orderRes.ok) {
          return json({
            error: `Supabase pedidos HTTP ${orderRes.status}: ${orderText}`
          }, 502);
        }

        const id = Array.isArray(orderJson)
          ? orderJson[0]?.id
          : orderJson?.id;

        if (!id) {
          return json({
            error: "Supabase não retornou o número do pedido."
          }, 502);
        }

        const itemRows = itens.map(x => ({
          pedido_id: id,
          produto_nome: String(x.produto_nome || ""),
          quantidade: Number(x.quantidade) || 1,
          preco_unitario: Number(x.preco_unitario) || 0,
          subtotal: Number(x.subtotal) || 0
        }));

        const itemsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/itens_pedido`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(itemRows)
          }
        );

        const itemsText = await itemsRes.text();

        if (!itemsRes.ok) {
          return json({
            error: `Supabase itens HTTP ${itemsRes.status}: ${itemsText}`,
            id
          }, 502);
        }

        return json({ id });

      } catch (e) {
        return json({
          error: `Falha de conexão com o Supabase: ${e?.message || e}`
        }, 502);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
