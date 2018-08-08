const dns = require('dnsimple');

let dnsimple;
const createDNS = ({ dnsimpleToken: accessToken }) => {
  if (dnsimple) return dnsimple;
  dnsimple = dns({ accessToken });
  return dnsimple;
};

const updateRecords = ({
  dnsimpleToken,
  dnsimpleAccountID,
  rootDomain,
  records = [],
  attributes,
}) => {
  const dnsClient = createDNS({ dnsimpleToken });
  const promises = [];
  records.forEach((record) => {
    const promise = new Promise((resolve, reject) => {
      dnsClient.zones
        .updateZoneRecord(
          dnsimpleAccountID,
          rootDomain,
          record.id,
          attributes,
        )
        .then((res) => {
          console.log(`✅   ${record.type} record successfully udpated`);
          return resolve(res);
        })
        .catch(err => reject(err));
    });
    promises.push(promise);
  });
  return Promise.all(promises);
};

const createRecord = ({
  dnsimpleToken,
  dnsimpleAccountID,
  rootDomain,
  record,
}) => new Promise((resolve, reject) => {
  const dnsClient = createDNS({ dnsimpleToken });
  dnsClient.zones
    .createZoneRecord(dnsimpleAccountID, rootDomain, record)
    .then((res) => {
      console.log(`✅   ${record.type} record successfully created`);
      return resolve(res);
    })
    .catch(err => reject(err));
});

const defaultCreateDNSRecords = ({
  dnsimpleToken,
  dnsimpleAccountID,
  rootDomain,
  subDomain,
  publicIp,
}) => new Promise((resolve, reject) => {
  const dnsClient = createDNS({ dnsimpleToken });
  const scope = {};
  console.log(`Creating DNS records for IP ${publicIp}`);
  dnsClient.zones
    .allZoneRecords(dnsimpleAccountID, rootDomain)
    .then((data) => {
      scope.data = data;
      // create or update A records
      const aRecords = data.filter(
        ({ type, name }) => type === 'A' && name === subDomain,
      );
      if (aRecords.length > 0) {
        const attributes = { content: publicIp, name: subDomain };
        return updateRecords({
          dnsimpleToken,
          dnsimpleAccountID,
          rootDomain,
          records: aRecords,
          attributes,
        });
      }
      const aRecord = {
        name: subDomain,
        type: 'A',
        ttl: 60,
        content: publicIp,
      };
      return createRecord({
        dnsimpleToken,
        dnsimpleAccountID,
        rootDomain,
        record: aRecord,
      });
    })
    .then(() => {
      // create or update CNAME records
      const cNames = scope.data.filter(
        ({ type, name }) => type === 'CNAME' && name === `*.${subDomain}`
      );
      if (cNames.length > 0) {
        const attributes = {
          content: `${subDomain}.${rootDomain}`,
          name: `*.${subDomain}`,
        };
        return updateRecords({
          dnsimpleToken,
          dnsimpleAccountID,
          rootDomain,
          records: cNames,
          attributes,
        });
      }
      const cName = {
        name: `*.${subDomain}`,
        type: 'CNAME',
        ttl: 60,
        content: `${subDomain}.${rootDomain}`,
      };
      return createRecord({
        dnsimpleToken,
        dnsimpleAccountID,
        rootDomain,
        record: cName,
      });
    })
    .then(() => resolve())
    .catch(err => reject(err));
});

const createDNSRecords = ({
  dnsimpleAccountID,
  dnsimpleToken,
  rootDomain,
  subDomain,
  userCreateDNSRecords,
  publicIp,
}) => new Promise((resolve, reject) => {
  if (!publicIp || typeof publicIp !== 'string') {
    return reject(new Error('Could not find publicIp'));
  }
  if (userCreateDNSRecords) {
    return userCreateDNSRecords(publicIp)
      .then(() => resolve())
      .catch(error => reject(error));
  }
  return defaultCreateDNSRecords({
    dnsimpleToken,
    dnsimpleAccountID,
    rootDomain,
    subDomain,
    publicIp,
  })
    .then(() => resolve())
    .catch(error => reject(error));
});

const deleteRecord = ({
  dnsimpleToken,
  dnsimpleAccountID,
  rootDomain,
  record,
}) => new Promise((resolve, reject) => {
  const dnsClient = createDNS({ dnsimpleToken });
  dnsClient
    .zones
    .deleteZoneRecord(dnsimpleAccountID, rootDomain, record.id)
    .then(() => {
      console.log(`Deleted ${record.type} record: ${record.id}`);
      return resolve();
    })
    .catch(err => reject(err));
});

const deleteDNSRecords = async ({
  dnsimpleToken,
  dnsimpleAccountID,
  rootDomain,
  subDomain,
}) => {
  const dnsClient = createDNS({ dnsimpleToken });
  const data = await dnsClient.zones.allZoneRecords(dnsimpleAccountID, rootDomain);
  const promises = [];
  const aRecords = data.filter(({ type, name }) => type === 'A' && name === subDomain);
  if (aRecords.length > 0) {
    const delete$ = aRecords.map(record => deleteRecord({
      dnsimpleToken,
      dnsimpleAccountID,
      rootDomain,
      record,
    }));
    promises.push(...delete$);
  }
  const cNames = data.filter(({ type, name }) => type === 'CNAME' && name === `*.${subDomain}`);
  if (cNames.length > 0) {
    const delete$ = cNames.map(record => deleteRecord({
      dnsimpleToken,
      dnsimpleAccountID,
      rootDomain,
      record,
    }));
    promises.push(...delete$);
  }
  try {
    const res = await Promise.all(promises);
    return res;
  } catch (e) {
    throw new Error(e);
  }
};

module.exports = {
  createDNSRecords,
  deleteDNSRecords,
};
