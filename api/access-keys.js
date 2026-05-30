/* global process */
import { createHash } from 'crypto';
import { createClient } from '@vercel/kv';

function getKvClient() {
  return createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

function hashAccessKey(accessKey) {
  return createHash('sha256').update(accessKey.trim()).digest('hex');
}

function splitEnvList(value) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getAllowedKeyHashes() {
  const explicitHashes = splitEnvList(process.env.ACCESS_KEY_HASHES);
  if (explicitHashes.length > 0) return explicitHashes;
  return splitEnvList(process.env.ACCESS_KEYS).map(hashAccessKey);
}

function getPreusedKeyHashes() {
  const explicitHashes = splitEnvList(process.env.ACCESS_KEY_PREUSED_HASHES);
  if (explicitHashes.length > 0) return explicitHashes;
  return splitEnvList(process.env.ACCESS_KEYS_PREUSED).map(hashAccessKey);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metoda niedozwolona' });
  }

  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return res.status(500).json({ success: false, error: 'Brak konfiguracji KV.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const accessKey = body?.accessKey?.trim();
    const profileName = body?.profileName?.trim() || 'Profil bez nazwy';

    if (!accessKey) {
      return res.status(400).json({ success: false, error: 'Podaj klucz dostępu.' });
    }

    const allowedKeyHashes = getAllowedKeyHashes();
    if (allowedKeyHashes.length === 0) {
      return res.status(500).json({ success: false, error: 'Brak skonfigurowanych kluczy dostępu.' });
    }

    const accessKeyHash = hashAccessKey(accessKey);
    if (!allowedKeyHashes.includes(accessKeyHash)) {
      return res.status(403).json({ success: false, error: 'Nieprawidłowy klucz dostępu.' });
    }

    const preusedKeyHashes = getPreusedKeyHashes();
    if (preusedKeyHashes.includes(accessKeyHash)) {
      return res.status(409).json({ success: false, error: 'Ten klucz dostępu został już wykorzystany.' });
    }

    const kv = getKvClient();
    const usedKeyId = `access_key_used:${accessKeyHash}`;
    const existingUsage = await kv.get(usedKeyId);
    if (existingUsage) {
      return res.status(409).json({ success: false, error: 'Ten klucz dostępu został już wykorzystany.' });
    }

    const usage = {
      accessKeyHash,
      profileName,
      usedAt: new Date().toISOString(),
    };

    await kv.set(usedKeyId, usage);

    return res.status(200).json({
      success: true,
      data: {
        accessKeyHash,
        usedAt: usage.usedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
