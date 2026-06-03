import FtpDeploy from 'ftp-deploy';

const ftpDeploy = new FtpDeploy();

const config = {
  user:          'seme-2289142',
  password:      'FTPChoune@69',
  host:          'ftp.seme-et-tisse.fr',
  port:          21,
  localRoot:     './dist',
  remoteRoot:    '/volley-coach/',
  include:       ['*', '**/*'],
  deleteRemote:  false,
  forcePasv:     true,
};

console.log('🚀 Déploiement JSA Coach → /htdocs/volley-coach/ ...');

ftpDeploy
  .deploy(config)
  .then(() => console.log('✅ Déploiement terminé !'))
  .catch(err => { console.error('❌ Erreur FTP :', err); process.exit(1); });

ftpDeploy.on('uploaded', info =>
  console.log(`  ↑ ${info.filename} (${info.transferredFileCount}/${info.totalFilesCount})`)
);
