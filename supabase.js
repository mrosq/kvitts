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

  async function gaMedIRum(roomId, minNamn, befintligtPersonId) {
    const c = client();
    // Idempotent: om vi redan har ett person_id för detta rum, återanvänd det.
    if (befintligtPersonId) {
      const { data: befintlig } = await c
        .from("members")
        .select("id")
        .eq("id", befintligtPersonId)
        .eq("room_id", roomId)
        .maybeSingle();
      if (befintlig) return { roomId, personId: befintlig.id };
    }
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

  async function sokMedIdentitetHash(roomId, identitetHash) {
    const c = client();
    const { data, error } = await c
      .from("members")
      .select()
      .eq("room_id", roomId)
      .eq("identitet_hash", identitetHash);
    if (error) throw error;
    return data || [];
  }

  async function hamtaMedToken(memberToken) {
    const c = client();
    const { data, error } = await c
      .from("members")
      .select()
      .eq("member_token", memberToken)
      .maybeSingle();
    if (error) throw error;
    return data; // null om inte finns
  }

  async function uppdateraMemberIdentitet(personId, identitetHash, memberToken) {
    const c = client();
    const patch = {};
    if (identitetHash !== undefined) patch.identitet_hash = identitetHash;
    if (memberToken !== undefined) patch.member_token = memberToken;
    const { error } = await c.from("members").update(patch).eq("id", personId);
    if (error) throw error;
  }

  // ── Mappning DB → klient ────────────────────────────────────────────────
  // DB: { id(uuid), room_id, beskrivning, belopp, betalare_id(uuid),
  //       fordelning(jsonb), datum(date), lagd_till_av_id(uuid), skapad }
  // Klient: { id, beskrivning, belopp, betalare_id, fordelning, datum,
  //           lagd_till_av_id, splitTyp?, inkluderade?, egnaBelopp? }
  // split-metadata (splitTyp, inkluderade, egnaBelopp) lagras som _meta i fordelning jsonb.
  function dbTillKlient(row) {
    const fordelning = { ...(row.fordelning || {}) };
    const meta = fordelning._meta || {};
    delete fordelning._meta;
    return {
      id: row.id,
      beskrivning: row.beskrivning,
      belopp: Number(row.belopp),
      betalare_id: row.betalare_id,
      fordelning,
      datum: row.datum,           // "YYYY-MM-DD" från Supabase date-kolumn
      lagd_till_av_id: row.lagd_till_av_id,
      splitTyp: meta.splitTyp || undefined,
      inkluderade: meta.inkluderade || undefined,
      egnaBelopp: meta.egnaBelopp || undefined,
    };
  }

  function klientTillDb(roomId, utgift, lagdTillAvId) {
    const fordelning = { ...(utgift.fordelning || {}) };
    if (utgift.splitTyp || utgift.inkluderade || utgift.egnaBelopp) {
      fordelning._meta = {
        splitTyp: utgift.splitTyp,
        inkluderade: utgift.inkluderade,
        egnaBelopp: utgift.egnaBelopp,
      };
    }
    return {
      room_id: roomId,
      beskrivning: utgift.beskrivning,
      belopp: utgift.belopp,
      betalare_id: utgift.betalare_id,
      fordelning,
      datum: utgift.datum,
      lagd_till_av_id: lagdTillAvId,
    };
  }

  // ── CRUD utgifter ────────────────────────────────────────────────────────

  async function hamtaUtgifter(roomId) {
    const c = client();
    const { data, error } = await c
      .from("expenses")
      .select()
      .eq("room_id", roomId)
      .order("skapad", { ascending: false });
    if (error) throw error;
    return (data || []).map(dbTillKlient);
  }

  async function laggTillUtgiftRum(roomId, utgift, lagdTillAvId) {
    const c = client();
    const { data, error } = await c
      .from("expenses")
      .insert(klientTillDb(roomId, utgift, lagdTillAvId))
      .select()
      .single();
    if (error) throw error;
    return dbTillKlient(data);
  }

  async function uppdateraUtgift(id, patch) {
    const c = client();
    const dbPatch = {};
    if (patch.beskrivning !== undefined) dbPatch.beskrivning = patch.beskrivning;
    if (patch.belopp !== undefined) dbPatch.belopp = patch.belopp;
    if (patch.betalare_id !== undefined) dbPatch.betalare_id = patch.betalare_id;
    if (patch.datum !== undefined) dbPatch.datum = patch.datum;
    if (patch.fordelning !== undefined || patch.splitTyp !== undefined || patch.inkluderade !== undefined || patch.egnaBelopp !== undefined) {
      const fordelning = { ...(patch.fordelning || {}) };
      if (patch.splitTyp || patch.inkluderade || patch.egnaBelopp) {
        fordelning._meta = {
          splitTyp: patch.splitTyp,
          inkluderade: patch.inkluderade,
          egnaBelopp: patch.egnaBelopp,
        };
      }
      dbPatch.fordelning = fordelning;
    }
    const { error } = await c.from("expenses").update(dbPatch).eq("id", id);
    if (error) throw error;
  }

  async function raderaUtgiftRum(id) {
    const c = client();
    const { error } = await c.from("expenses").delete().eq("id", id);
    if (error) throw error;
  }

  window.KvittsSupabase = {
    skapaRum, haRum, gaMedIRum, hamtaDeltagare,
    hamtaUtgifter, laggTillUtgiftRum, uppdateraUtgift, raderaUtgiftRum,
    sokMedIdentitetHash, hamtaMedToken, uppdateraMemberIdentitet,
  };
})();
