// Tunna wrappers runt Supabase-klienten för grupp-flödet (feature 004).
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

  async function skapaGrupp(projektnamn, minNamn) {
    const c = client();
    const { data: grupp, error: gruppErr } = await c
      .from("rooms")
      .insert({ namn: projektnamn })
      .select()
      .single();
    if (gruppErr) throw gruppErr;
    const { data: medlem, error: medlemErr } = await c
      .from("members")
      .insert({ room_id: grupp.id, namn: minNamn })
      .select()
      .single();
    if (medlemErr) throw medlemErr;
    return { gruppId: grupp.id, gruppNamn: grupp.namn, personId: medlem.id };
  }

  async function haGrupp(gruppId) {
    const c = client();
    const { data, error } = await c
      .from("rooms")
      .select()
      .eq("id", gruppId)
      .maybeSingle();
    if (error) throw error;
    return data; // null om inte finns
  }

  async function gaMedIGrupp(gruppId, minNamn, befintligtPersonId) {
    const c = client();
    // Idempotent: om vi redan har ett person_id för denna grupp, återanvänd det.
    if (befintligtPersonId) {
      const { data: befintlig } = await c
        .from("members")
        .select("id")
        .eq("id", befintligtPersonId)
        .eq("room_id", gruppId)
        .maybeSingle();
      if (befintlig) return { gruppId, personId: befintlig.id };
    }
    const { data: medlem, error } = await c
      .from("members")
      .insert({ room_id: gruppId, namn: minNamn })
      .select()
      .single();
    if (error) throw error;
    return { gruppId, personId: medlem.id };
  }

  async function hamtaDeltagare(gruppId) {
    const c = client();
    const { data, error } = await c
      .from("members")
      .select()
      .eq("room_id", gruppId)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function sokMedIdentitetHash(gruppId, identitetHash) {
    const c = client();
    const { data, error } = await c
      .from("members")
      .select()
      .eq("room_id", gruppId)
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

  function klientTillDb(gruppId, utgift, lagdTillAvId) {
    const fordelning = { ...(utgift.fordelning || {}) };
    if (utgift.splitTyp || utgift.inkluderade || utgift.egnaBelopp) {
      fordelning._meta = {
        splitTyp: utgift.splitTyp,
        inkluderade: utgift.inkluderade,
        egnaBelopp: utgift.egnaBelopp,
      };
    }
    return {
      room_id: gruppId,
      beskrivning: utgift.beskrivning,
      belopp: utgift.belopp,
      betalare_id: utgift.betalare_id,
      fordelning,
      datum: utgift.datum,
      lagd_till_av_id: lagdTillAvId,
    };
  }

  // ── CRUD utgifter ────────────────────────────────────────────────────────

  async function hamtaUtgifter(gruppId) {
    const c = client();
    const { data, error } = await c
      .from("expenses")
      .select()
      .eq("room_id", gruppId)
      .order("skapad", { ascending: false });
    if (error) throw error;
    return (data || []).map(dbTillKlient);
  }

  async function laggTillUtgiftGrupp(gruppId, utgift, lagdTillAvId) {
    const c = client();
    const { data, error } = await c
      .from("expenses")
      .insert(klientTillDb(gruppId, utgift, lagdTillAvId))
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

  async function raderaUtgiftGrupp(id) {
    const c = client();
    const { error } = await c.from("expenses").delete().eq("id", id);
    if (error) throw error;
  }

  // ── Gemensam reglering (feature 017) ──────────────────────────
  // En rad i `settlements` = kreditorn (till_id) har bekräftat att debitorn
  // (fran_id) betalat `belopp`. Nycklas på (room_id, fran_id, till_id).

  async function hamtaKvittenser(gruppId) {
    const c = client();
    const { data, error } = await c
      .from("settlements")
      .select()
      .eq("room_id", gruppId);
    if (error) throw error;
    return (data || []).map((row) => ({
      fran: row.fran_id,
      till: row.till_id,
      belopp: Number(row.belopp),
      kvitterad_at: row.kvitterad_at,
    }));
  }

  async function kvitteraOverforing(gruppId, franId, tillId, belopp) {
    const c = client();
    const { error } = await c
      .from("settlements")
      .upsert(
        { room_id: gruppId, fran_id: franId, till_id: tillId, belopp, kvitterad_at: new Date().toISOString() },
        { onConflict: "room_id,fran_id,till_id" }
      );
    if (error) throw error;
  }

  async function avKvitteraOverforing(gruppId, franId, tillId) {
    const c = client();
    const { error } = await c
      .from("settlements")
      .delete()
      .eq("room_id", gruppId)
      .eq("fran_id", franId)
      .eq("till_id", tillId);
    if (error) throw error;
  }

  window.KvittsSupabase = {
    skapaGrupp, haGrupp, gaMedIGrupp, hamtaDeltagare,
    hamtaUtgifter, laggTillUtgiftGrupp, uppdateraUtgift, raderaUtgiftGrupp,
    sokMedIdentitetHash, hamtaMedToken, uppdateraMemberIdentitet,
    hamtaKvittenser, kvitteraOverforing, avKvitteraOverforing,
  };
})();
