/**
 * DNSimple TXT Record Cleanup Script
 * 
 * This script bulk deletes TXT records containing a specific search term from DNSimple.
 * Useful for cleaning up stale ACME challenge records that can interfere with Let's Encrypt
 * certificate generation when multiple challenge attempts leave behind orphaned TXT records.
 * 
 * Usage:
 *   export DNSIMPLE_TOKEN=your_token_here
 *   export DNSIMPLE_ACCOUNT_ID=your_account_id
 *   node cleanup-txt-records.js [search_term]
 * 
 * Examples:
 *   node cleanup-txt-records.js node-22           # Delete all TXT records containing "node-22"
 *   node cleanup-txt-records.js _acme-challenge   # Delete all ACME challenge records
 *   node cleanup-txt-records.js staging          # Delete all TXT records containing "staging"
 */

const dns = require('dnsimple');

const token = process.env.DNSIMPLE_TOKEN;

const dnsClient = dns({ accessToken: token });

const ACCOUNT_ID = process.env.DNSIMPLE_ACCOUNT_ID || 'YOUR_ACCOUNT_ID';
const DOMAIN = 'wondev.net';
const SEARCH_TERM = process.argv[2];

async function deleteTxtRecords() {
  try {
    const records = await dnsClient.zones.allZoneRecords(ACCOUNT_ID, DOMAIN);

    const txtRecords = records.filter((record) =>
      record.type === 'TXT' && record.name.includes(SEARCH_TERM),
    );

    if (txtRecords.length === 0) {
      return;
    }

    const deletePromises = txtRecords.map(async (record) => {
      try {
        await dnsClient.zones.deleteZoneRecord(ACCOUNT_ID, DOMAIN, record.id);
        return { success: true, name: record.name };
      } catch (error) {
        return { success: false, name: record.name, error: error.message };
      }
    });

    const results = await Promise.all(deletePromises);
    const successful = results.filter((r) => r.success).length;
  } catch (error) {
    throw new Error(error.message);
  }
}

deleteTxtRecords();