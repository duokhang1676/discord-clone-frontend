const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const certDir = path.join(__dirname, 'cert');

// Create cert directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

console.log('Generating self-signed SSL certificate...\n');

try {
  // Generate a keypair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'VN' },
    { shortName: 'ST', value: 'HCM' },
    { name: 'localityName', value: 'HCM' },
    { name: 'organizationName', value: 'VoiceChat' }
  ];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Add extensions
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '192.168.1.6' }
      ]
    }
  ]);
  
  // Self-sign certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  // Convert to PEM format
  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
  
  // Write files
  fs.writeFileSync(path.join(certDir, 'cert.pem'), pemCert);
  fs.writeFileSync(path.join(certDir, 'key.pem'), pemKey);
  
  console.log('✅ SSL certificate generated successfully!');
  console.log('📁 Location: cert/');
  console.log('   - cert/cert.pem');
  console.log('   - cert/key.pem\n');
  console.log('🔐 Certificate details:');
  console.log('   Valid for: 1 year');
  console.log('   Common Name: localhost');
  console.log('   IP: 192.168.1.6\n');
} catch (error) {
  console.error('❌ Failed to generate certificate:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
