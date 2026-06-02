import React, { useState } from 'react';



interface LoginProps {
  onLogin: (pseudo: string, pass: string) => void;
  onRegister: (
    pseudo: string,
    pass: string,
    nom: string,
    prenom: string
  ) => void;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
}

export default function Login({
  onLogin,
  onRegister,
  isRegistering,
  setIsRegistering,
}: LoginProps) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');

  const logoPath = `${import.meta.env.BASE_URL}logo_coach192.png`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      onRegister(pseudo, password, nom, prenom);
    } else {
      onLogin(pseudo, password);
    }
  };

  return (
    <div className="login-container">
      <img 
        src={logoPath} 
        alt="Logo JSA" 
        className="club-logo" 
        onError={(e) => {
          // Sécurité : si le chemin dynamique échoue, on tente le chemin relatif simple
          const target = e.target as HTMLImageElement;
          if (target.src !== './logo_coach192.png') {
            target.src = './logo_coach192.png';
          }
        }}
      />

      <div className="login-card">
        <h2
          className="login-type-title"
          style={{ textTransform: 'uppercase', fontWeight: 900 }}
        >
          {isRegistering ? 'INSCRIPTION COACH' : 'ESPACE COACH JSA'}
        </h2>

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <input
                type="text"
                className="login-input"
                placeholder="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
              />
              <input
                type="text"
                className="login-input"
                placeholder="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </>
          )}

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="login-input"
              placeholder="Pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="password"
              className="login-input"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button">
            {isRegistering ? 'CRÉER COMPTE' : 'SE CONNECTER'}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: '20px' }}>
          <span
            className="yellow-link"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ cursor: 'pointer' }}
          >
            {isRegistering
              ? 'Déjà un compte ? Se connecter'
              : "Nouveau coach ? S'inscrire"}
          </span>
        </div>
      </div>
    </div>
  );
}
