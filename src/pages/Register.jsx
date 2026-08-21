import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const { registrar } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await registrar(email, password, nombre);
      navigate('/');
    } catch (err) {
      setError(err.message || 'No se pudo registrar.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-arcade-panel p-6 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-arcade-accent">Crear cuenta</h1>
        <input className="w-full p-2 rounded bg-black/30" placeholder="Tu nombre"
          value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input className="w-full p-2 rounded bg-black/30" type="email" placeholder="Correo"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full p-2 rounded bg-black/30" type="password" placeholder="Contraseña (mín. 6 caracteres)"
          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="w-full bg-arcade-accent p-2 rounded font-semibold">Registrarme</button>
        <p className="text-sm text-center">¿Ya tienes cuenta? <Link to="/login" className="text-arcade-accent2">Inicia sesión</Link></p>
      </form>
    </div>
  );
}
