import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await iniciarSesion(email, password);
      navigate('/');
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-arcade-panel p-6 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-arcade-accent">Nuestro Arcade Privado</h1>
        <input className="w-full p-2 rounded bg-black/30" type="email" placeholder="Correo"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full p-2 rounded bg-black/30" type="password" placeholder="Contraseña"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="w-full bg-arcade-accent p-2 rounded font-semibold">Entrar</button>
        <p className="text-sm text-center">¿No tienes cuenta? <Link to="/registro" className="text-arcade-accent2">Regístrate</Link></p>
      </form>
    </div>
  );
}
