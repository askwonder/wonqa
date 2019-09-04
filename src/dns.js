const dns = require('dnsimple');
const AWS = require('aws-sdk');

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

const route53EditDNSRecord = ({
  rootDomain,
  subDomain,
  hostedZoneId,
  recValue,
  reqType,
  recType
}) => new Promise((resolve,reject) => {
  
  var params = {
    ChangeBatch: {
    Changes: [
        {
      Action: reqType, 
      ResourceRecordSet: {
        Name: subDomain+'.'+rootDomain, 
        ResourceRecords: [
          {
          Value: recValue
        }
        ], 
        TTL: 60, 
        Type: recType
      }
      }
    ], 
    Comment: "Test Instance"
    }, 
    HostedZoneId: hostedZoneId
  };


  const route53 = new AWS.Route53();
  
  route53.changeResourceRecordSets(params, (err, data)=>{
    if (err) { reject(err);}          // an error occurred
    else  { resolve(data);     }      // successful response
  })
});

const route53CreateDNSRecords = ({
  rootDomain,
  subDomain,
  publicIp,
  hostedZoneId
}) => new Promise((resolve, reject) => {

  console.log(`Creating DNS records for IP ${publicIp}`);

      return route53EditDNSRecord({
        rootDomain,
        subDomain,
        hostedZoneId,
        recValue: publicIp,
        recType: 'A',
        reqType: 'UPSERT'
      })
      .then(()=>{
        
        // create or update CNAME records
        return route53EditDNSRecord({
          rootDomain,
          subDomain: '*.'+subDomain,
          hostedZoneId,
          recValue: subDomain+'.'+rootDomain,
          recType: 'CNAME',
          reqType: 'UPSERT'
        });
      
    })
    .then(() => resolve())
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
  dnsProvider,
  userCreateDNSRecords,
  hostedZoneId,
  publicIp,
}) => new Promise((resolve, reject) => {
  if (!publicIp || typeof publicIp !== 'string') {
    return reject(new Error('Could not find publicIp'));
  }
  if (userCreateDNSRecords) {
    return userCreateDNSRecords(publicIp, rootDomain, subDomain)
      .then(() => resolve())
      .catch(error => reject(error));
  }else if (dnsProvider == 'ROUTE_53'){
    return route53CreateDNSRecords({
      rootDomain,
      subDomain,
      publicIp,
      hostedZoneId,
    })
      .then(() => resolve())
      .catch(error => reject(error))

  } else {

    return defaultCreateDNSRecords({
      dnsimpleToken,
      dnsimpleAccountID,
      rootDomain,
      subDomain,
      publicIp,
    })
      .then(() => resolve())
      .catch(error => reject(error));
  }
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
  dnsProvider,
  hostedZoneId,
  rootDomain,
  subDomain,
}) => {
  if (dnsProvider == 'ROUTE_53'){
    const route53 = new AWS.Route53();
    const data = await route53.listResourceRecordSets({HostedZoneId:hostedZoneId}).promise();
    
    const aRecords = data.ResourceRecordSets.filter(
      ({ Type, Name }) => Type === 'A' && Name === subDomain+'.'+rootDomain+'.',
    );
    aRecords.forEach(async (record) =>  {
      await route53EditDNSRecord({
        rootDomain,
        subDomain,
        hostedZoneId,
        reqType: 'DELETE',
        recType: 'A',
        recValue: record.ResourceRecords[0].Value
      })
    })

    const cRecords = data.ResourceRecordSets.filter(
      ({ Type, Name }) => Type === 'CNAME' && Name === '*.'+subDomain+'.'+rootDomain+'.',
    );

    cRecords.forEach(async (record) => {
      await route53EditDNSRecord({
        rootDomain,
        subDomain,
        hostedZoneId,
        reqType: 'DELETE',
        recType: 'CNAME',
        recValue: '*.'+subDomain+'.'+rootDomain
      })
    })

    return;
  }
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
