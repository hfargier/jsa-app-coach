import FtpDeploy from 'ftp-deploy';

const ftpDeploy = new FtpDeploy();

const config = {
  user:         'seme-2289142',
  password:     'FTPChoune@69',
  host:         'ftp.seme-et-tisse.fr',
  port:         21,
  localRoot:    './public',
  remoteRoot:   '/API/',
  include:      ['api_volley_coach.php'],
  deleteRemote: false,
  forcePasv:    true,
};

console.log('🚀 Déploiement API → /API/api_volley_coach.php ...');

ftpDeploy
  .deploy(config)
  .then(() => console.log('✅ API déployée !'))
  .catch(err => { console.error('❌ Erreur FTP :', err); process.exit(1); });
