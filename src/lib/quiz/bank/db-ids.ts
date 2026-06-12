// DB UUID ↔ bank text-id bridge for the composer's pack read path.
//
// public.questions rows carry deterministic UUIDv5 ids minted from the
// legacy bank slug under the RFC 4122 URL namespace (see migration
// 20260518400000_quiz_questions_db_infra.sql). The composer, ?config=
// share URLs and /api/test-sets validation all speak text ids, so RPC
// payloads (get_platform_pack_question_ids) must be translated at the
// fetch boundary — that translation map is built here.
//
// Two sources, merged:
//   1. computed — uuidv5(URL_NS, bankId) for every question in the bank;
//      covers every legacy question and any future seed that follows the
//      slug convention.
//   2. explicit — the 30 E37 questions (migration 20260521280000) whose
//      UUIDs were minted from slugs that were never recorded anywhere;
//      their ported bank ids (e37-*) cannot reproduce the original hash,
//      so the pairs are pinned verbatim below.
//
// The bank module is dynamic-imported so this file can be referenced
// from `pack-queries.ts` (eagerly loaded by the /tests catalog) without
// pulling the ~4.5k-line bank into that chunk.

const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export const E37_DB_UUID_TO_BANK_ID: ReadonlyMap<string, string> = new Map([
  ["36b9fe06-edfb-5523-907c-824dceff1506", "e37-2fa-recovery-email-1"],
  ["8fe80139-f8a8-58b6-b16e-37db2e2dcb19", "e37-2fa-passkey-vs-sms-1"],
  ["b34d9a6c-10b2-5c7f-862b-5c97a5044f0e", "e37-2fa-hibp-fake-1"],
  ["cb818dec-3686-5da0-b0b6-2ce3ed041385", "e37-2fa-credential-stuffing-1"],
  ["cae59f5b-ec9d-5bab-9b41-214a9f65ab3d", "e37-2fa-oauth-consent-1"],
  ["3356257d-a76f-5e7f-9c31-e3f3060bffcb", "e37-2fa-banking-popup-1"],
  ["43fb5279-4085-5c12-b58f-2ce74be2a09f", "e37-2fa-bitwarden-alert-1"],
  ["57fa4658-9604-57b1-9e4b-26add9a4285f", "e37-ai-spear-invoice-1"],
  ["5049bc4d-8c1d-5505-87a1-5448911a5720", "e37-ai-trading-bot-1"],
  ["1f9ef987-632b-510c-a593-f17370b840b2", "e37-ai-dating-profile-1"],
  ["e61a7af5-90c4-5950-8cd2-792af148f2d3", "e37-ai-voice-extortion-1"],
  ["e917b2fe-bad3-546f-a39f-861a7d1f28ce", "e37-soc-meta-business-1"],
  ["f40c1024-6328-5dcc-8113-8d804289a370", "e37-soc-ig-help-center-1"],
  ["71513402-4be4-5126-b19d-4ca578cebdfc", "e37-soc-telegram-invest-1"],
  ["326a6311-210a-55c3-9c0c-a9bbabf5e86d", "e37-soc-fb-ad-eshop-1"],
  ["0eaa14c6-84a7-5d98-9fe6-a6ee469a11eb", "e37-soc-messenger-kod-1"],
  ["f425524e-3b38-5f09-8760-65c813e360fc", "e37-soc-fb-2fa-mail-1"],
  ["611236e8-d384-53d1-af3b-44cce66a2bd1", "e37-rod-sextortion-1"],
  ["55a7e850-97d2-55ca-974f-d6b1901fd2cd", "e37-rod-grooming-1"],
  ["1bc8924f-e2f6-592d-a379-ede0f4bdef07", "e37-rod-family-link-1"],
  ["738417a8-a88a-5c3d-bc7a-f6cfe075ee28", "e37-rod-disney-sms-1"],
  ["502fe72e-cb18-504e-aca7-1a1546f587da", "e37-sko-edupage-1"],
  ["b84798e0-adf0-51c9-a448-fe797aebab17", "e37-sko-eu-dotacia-1"],
  ["ef5123da-68ca-53a9-b534-d0c83edd0620", "e37-sko-vyzvednutie-1"],
  ["78d29600-9a2d-598a-9d11-886f63376e1f", "e37-zdr-erecept-overenie-1"],
  ["ca064d2d-0611-5e7d-8856-7cb095395857", "e37-zdr-vysledky-call-1"],
  ["4dba6939-84e7-5c51-a8e7-73dbe5b128fd", "e37-zdr-iban-switch-1"],
  ["e50a9ed9-7984-570e-8c8b-5131eafe4258", "e37-zdr-makro-priloha-1"],
  ["115edd0c-784d-5160-8aea-452ab1d70e54", "e37-zdr-nczi-sms-1"],
  ["12f096cd-3af9-5276-8487-f496ee378c31", "e37-zdr-slovensko-sso-1"],
]);

function parseUuidBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function uuidv5(name: string, namespace: string = URL_NAMESPACE): Promise<string> {
  const nsBytes = parseUuidBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes, 0);
  data.set(nameBytes, nsBytes.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", data)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let mapPromise: Promise<ReadonlyMap<string, string>> | null = null;

export function getDbUuidToBankIdMap(): Promise<ReadonlyMap<string, string>> {
  mapPromise ??= (async () => {
    const { QUESTIONS } = await import("./questions");
    const map = new Map<string, string>(E37_DB_UUID_TO_BANK_ID);
    const computed = await Promise.all(
      QUESTIONS.map(async (q) => [await uuidv5(q.id), q.id] as const),
    );
    for (const [uuid, bankId] of computed) {
      if (!map.has(uuid)) map.set(uuid, bankId);
    }
    return map;
  })();
  return mapPromise;
}
