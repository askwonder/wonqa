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