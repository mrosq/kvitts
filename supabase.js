// Tunna wrappers runt Supabase-klienten för rum-flödet (feature 004).
// Ingen DOM-access. Anropas från app.js.

(function () {
  let _client = null;

  function client() {
    if (_client) return _client;
    const cfg = window.KVITTS_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("KVITTS_CONFIG saknas — kontrollera config.js");
    }
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("supabase-js inte laddat — kontrollera CDN-script i index.html");
    }
    _client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
    return _client;
  }

  async function skapaRum(projektnamn, minNamn) {
    const c = client();
    const { data: rum, error: rumErr } = await c
      .from("rooms")
      .insert({ namn: projektnamn })
      .select()
      .single();
    if (rumErr) throw rumErr;
    const { data: medlem, error: medlemErr } = await c
      .from("members")
      .insert({ room_id: rum.id, namn: minNamn })
      .select()
      .single();
    if (medlemErr) throw medlemErr;
    return { roomId: rum.id, roomNamn: rum.namn, personId: medlem.id };
  }

  async function haRum(roomId) {
    const c = client();
    const { data, error } = await c
      .from("rooms")
      .select()
      .eq("id", roomId)
      .maybeSingle();
    if (error) throw error;
    return data; // null om inte finns
  }

  async function gaMedIRum(roomId, minNamn) {
    const c = client();
    const { data: medlem, error } = await c
      .from("members")
      .insert({ room_id: roomId, namn: minNamn })
      .select()
      .single();
    if (error) throw error;
    return { roomId, personId: medlem.id };
  }

  async function hamtaDeltagare(roomId) {
    const c = client();
    const { data, error } = await c
      .from("members")
      .select()
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  window.KvittsSupabase = { skapaRum, haRum, gaMedIRum, hamtaDeltagare };
})();
